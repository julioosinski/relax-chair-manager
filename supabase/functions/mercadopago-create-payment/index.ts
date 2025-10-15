import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Token do Mercado Pago não configurado no servidor' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { poltronaId, amount, description, pixKey } = await req.json();

    if (!poltronaId || !amount || !pixKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Dados incompletos: poltronaId, amount e pixKey são obrigatórios' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Creating payment for poltrona ${poltronaId}, amount: ${amount}`);

    // Criar pagamento no Mercado Pago
    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: description || `Pagamento Poltrona ${poltronaId}`,
      payment_method_id: 'pix',
      payer: {
        email: 'pagador@example.com',
      },
      metadata: {
        poltrona_id: poltronaId
      },
      notification_url: Deno.env.get('MERCADOPAGO_WEBHOOK_URL') || undefined
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `poltrona_${poltronaId}_${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Mercado Pago API error:', data);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Erro ao criar pagamento no Mercado Pago',
          details: data.message || `Status: ${response.status}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Payment created successfully: ${data.id}`);

    // Extrair dados do QR Code PIX
    const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: data.id,
        status: data.status,
        qrCode: qrCode,
        qrCodeBase64: qrCodeBase64,
        amount: data.transaction_amount,
        expirationDate: data.date_of_expiration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in mercadopago-create-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor',
        details: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
