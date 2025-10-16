import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para detectar o tipo da chave PIX
function getPixKeyType(pixKey: string): string {
  const cleanKey = pixKey.replace(/\D/g, '');
  
  if (pixKey.includes('@')) return 'EMAIL';
  if (cleanKey.length === 11) return 'CPF';
  if (cleanKey.length === 14) return 'CNPJ';
  if (pixKey.startsWith('+')) return 'PHONE';
  return 'EVP'; // Chave aleatória (UUID)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuração do servidor incompleta",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { poltronaId } = await req.json();

    if (!poltronaId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "poltronaId é obrigatório",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    console.log(`Creating fixed QR Code for poltrona ${poltronaId}`);

    // Buscar configurações da poltrona no banco
    const { data: poltrona, error: poltronaError } = await supabase
      .from("poltronas")
      .select("price, pix_key, active, qr_code, payment_id, ip")
      .eq("poltrona_id", poltronaId)
      .single();

    if (poltronaError || !poltrona) {
      console.error("Poltrona not found:", poltronaError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Poltrona não encontrada",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      );
    }

    if (!poltrona.active) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Poltrona está desativada",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Validar se a chave PIX está configurada
    if (!poltrona.pix_key || poltrona.pix_key.trim() === '') {
      console.error("PIX key not configured for poltrona:", poltronaId);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Chave PIX não configurada para esta poltrona",
          details: "Configure uma chave PIX válida nas configurações da poltrona"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    // Se já existe QR Code fixo válido (código PIX, não URL)
    const isPixCode = poltrona.qr_code && poltrona.qr_code.startsWith("00020126");

    if (isPixCode && poltrona.payment_id) {
      console.log(`Returning existing PIX QR Code for poltrona ${poltronaId}`);
      return new Response(
        JSON.stringify({
          success: true,
          paymentId: poltrona.payment_id,
          qrCode: poltrona.qr_code,
          amount: poltrona.price,
          message: "QR Code PIX existente retornado",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Se tem URL antiga, vamos substituir por QR PIX
    if (poltrona.qr_code && !isPixCode) {
      console.log(`Replacing old URL with PIX QR Code for poltrona ${poltronaId}`);
    }

    // Detectar tipo da chave PIX
    const pixKeyType = getPixKeyType(poltrona.pix_key);
    
    console.log(`PIX Key: ${poltrona.pix_key}, Type: ${pixKeyType}`);

    // Criar pagamento PIX fixo no Mercado Pago
    const paymentData = {
      transaction_amount: parseFloat(poltrona.price),
      description: `Massagem Poltrona ${poltronaId} - R$ ${poltrona.price}`,
      payment_method_id: "pix",
      payer: {
        email: "cliente@massagem.com",
        identification: {
          type: pixKeyType,
          number: poltrona.pix_key
        }
      },
      metadata: {
        poltrona_id: poltronaId,
        amount: poltrona.price,
        esp32_ip: poltrona.ip,
        pix_key: poltrona.pix_key,
        pix_key_type: pixKeyType
      },
    };

    console.log("Creating fixed PIX payment with key:", {
      pix_key: poltrona.pix_key,
      type: pixKeyType,
      amount: poltrona.price
    });

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `fixed_pix_${poltronaId}_${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Mercado Pago API error:", JSON.stringify(data, null, 2));
      console.error("Payment payload was:", JSON.stringify(paymentData, null, 2));

      let errorMessage = "Erro ao criar pagamento no Mercado Pago";
      let userMessage = data.message || "Erro desconhecido";

      if (data.message === "Unauthorized use of live credentials") {
        errorMessage = "Token de produção não autorizado";
        userMessage = "Use um token de TESTE do Mercado Pago";
      }

      // Erros específicos de chave PIX
      if (data.message?.includes("pix_key") || data.cause?.[0]?.code === "invalid_pix_key") {
        errorMessage = "Chave PIX inválida";
        userMessage = `A chave PIX '${poltrona.pix_key}' não é válida ou não está cadastrada no Mercado Pago`;
      }

      if (data.message?.includes("PSP") || data.message?.includes("receiver")) {
        errorMessage = "Recebedor rejeitado pelo PSP";
        userMessage = `Verifique se a chave PIX '${poltrona.pix_key}' está ativa e autorizada a receber pagamentos no Mercado Pago`;
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
          details: userMessage,
          statusCode: response.status,
          pixKey: poltrona.pix_key,
          pixKeyType: pixKeyType
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;

    if (!qrCode) {
      console.error("QR Code not generated by Mercado Pago");
      return new Response(
        JSON.stringify({
          success: false,
          message: "QR Code não foi gerado pelo Mercado Pago",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      );
    }

    // Salvar QR Code e Payment ID no banco
    const { error: updateError } = await supabase
      .from("poltronas")
      .update({
        qr_code: qrCode,
        payment_id: data.id.toString(),
        qr_code_generated_at: new Date().toISOString(),
      })
      .eq("poltrona_id", poltronaId);

    if (updateError) {
      console.error("Error saving QR Code to database:", updateError);
    }

    // Registrar pagamento pendente para polling
    await supabase.from("payments").insert({
      payment_id: data.id,
      poltrona_id: poltronaId,
      amount: data.transaction_amount,
      status: "pending",
    });

    // Registrar log com informações da chave PIX
    await supabase.from("logs").insert({
      poltrona_id: poltronaId,
      message: `QR Code PIX fixo gerado: Payment ID ${data.id}, Valor: R$ ${poltrona.price}, Chave: ${poltrona.pix_key} (${pixKeyType})`,
    });

    console.log(`Fixed PIX QR Code created for poltrona ${poltronaId}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: data.id,
        qrCode: qrCode,
        qrCodeBase64: qrCodeBase64,
        amount: data.transaction_amount,
        expirationDate: data.date_of_expiration,
        message: "QR Code PIX gerado com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Error in mercadopago-create-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({
        success: false,
        message: "Erro interno do servidor",
        details: errorMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
