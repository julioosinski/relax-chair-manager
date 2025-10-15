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
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Token do Mercado Pago não configurado no servidor',
          details: 'Configure MERCADOPAGO_ACCESS_TOKEN nos secrets' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Testing Mercado Pago connection...');

    // Testar conexão com Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mercado Pago API error:', errorData);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Falha na conexão com Mercado Pago',
          details: `Status ${response.status}: ${errorData.message || 'Token inválido ou expirado'}`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const data = await response.json();
    console.log('Mercado Pago connection successful');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conexão com Mercado Pago estabelecida com sucesso',
        details: `Token válido - ${data.length} métodos de pagamento disponíveis`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error testing Mercado Pago connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro ao testar conexão',
        details: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
