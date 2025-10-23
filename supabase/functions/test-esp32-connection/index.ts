import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { poltronaId } = await req.json();

    if (!poltronaId) {
      return new Response(
        JSON.stringify({ success: false, message: 'poltronaId é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar IP da poltrona
    const { data: poltrona, error: poltronaError } = await supabase
      .from('poltronas')
      .select('ip, poltrona_id')
      .eq('poltrona_id', poltronaId)
      .single();

    if (poltronaError || !poltrona) {
      console.error('❌ Poltrona não encontrada:', poltronaError);
      return new Response(
        JSON.stringify({ success: false, message: 'Poltrona não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log(`🔍 Testando conexão com ESP32 em ${poltrona.ip}`);

    // Testar conexão com /status
    const startTime = Date.now();
    let statusResponse;
    let connectionError = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      statusResponse = await fetch(`http://${poltrona.ip}/status`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const statusData = await statusResponse.text();

      console.log(`✅ ESP32 respondeu em ${responseTime}ms:`, statusData);

      return new Response(
        JSON.stringify({
          success: true,
          ip: poltrona.ip,
          status: 'online',
          responseTime,
          statusCode: statusResponse.status,
          response: statusData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      connectionError = error;
      const responseTime = Date.now() - startTime;

      console.error(`❌ Erro ao conectar com ESP32 após ${responseTime}ms:`, error);

      return new Response(
        JSON.stringify({
          success: false,
          ip: poltrona.ip,
          status: 'offline',
          responseTime,
          error: error.message,
          errorType: error.name,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
