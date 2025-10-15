import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!accessToken || !supabaseUrl || !supabaseKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Configuração do servidor incompleta' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { poltronaId } = await req.json();

    if (!poltronaId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'poltronaId é obrigatório' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Creating fixed QR Code for poltrona ${poltronaId}`);

    // Buscar configurações da poltrona no banco
    const { data: poltrona, error: poltronaError } = await supabase
      .from('poltronas')
      .select('price, pix_key, active, qr_code, payment_id')
      .eq('poltrona_id', poltronaId)
      .single();

    if (poltronaError || !poltrona) {
      console.error('Poltrona not found:', poltronaError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Poltrona não encontrada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!poltrona.active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Poltrona está desativada' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se já existe URL de pagamento público (Solução Hybrid)
    // URLs começam com http/https, códigos PIX começam com "00020126"
    const isPublicUrl = poltrona.qr_code && (poltrona.qr_code.startsWith('http://') || poltrona.qr_code.startsWith('https://'));
    
    if (isPublicUrl && poltrona.payment_id) {
      console.log(`Returning existing public payment URL for poltrona ${poltronaId}`);
      return new Response(
        JSON.stringify({
          success: true,
          paymentId: poltrona.payment_id,
          qrCode: poltrona.qr_code,
          amount: poltrona.price,
          message: 'URL de pagamento existente retornada'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    
    // Se tem QR Code PIX antigo, vamos substituir pela URL pública
    if (poltrona.qr_code && !isPublicUrl) {
      console.log(`Converting old PIX QR Code to public URL for poltrona ${poltronaId}`);
    }

    // Gerar URL da página de pagamento pública
    // Usar o referer do request ou construir baseado na URL do Supabase
    const requestUrl = req.headers.get('referer') || '';
    let frontendUrl = 'https://fdc0fbae-11ba-46ca-8d79-2032dc454d4e.lovableproject.com';
    
    // Se temos referer, usar o domínio dele
    if (requestUrl) {
      try {
        const url = new URL(requestUrl);
        frontendUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        console.log('Could not parse referer URL, using default');
      }
    }
    
    const publicPaymentUrl = `${frontendUrl}/pay/${poltronaId}`;
    
    console.log(`Generated public payment URL: ${publicPaymentUrl}`);
    
    // Salvar URL fixo no banco
    const fixedQRCode = publicPaymentUrl;
    const fixedPaymentId = `fixed_${poltronaId}_${Date.now()}`;
    
    const { error: updateError } = await supabase
      .from('poltronas')
      .update({
        qr_code: fixedQRCode,
        payment_id: fixedPaymentId,
        qr_code_generated_at: new Date().toISOString()
      })
      .eq('poltrona_id', poltronaId);

    if (updateError) {
      console.error('Error saving fixed URL to database:', updateError);
    }

    // Registrar log
    await supabase.from('logs').insert({
      poltrona_id: poltronaId,
      message: `URL de pagamento fixo gerado: ${publicPaymentUrl}`
    });

    console.log(`Fixed payment URL created and saved for poltrona ${poltronaId}`);

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: fixedPaymentId,
        qrCode: fixedQRCode,
        amount: poltrona.price,
        message: 'URL de pagamento fixo gerado'
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
