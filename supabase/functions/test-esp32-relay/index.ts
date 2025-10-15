import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { poltrona_id } = await req.json();

    if (!poltrona_id) {
      return new Response(
        JSON.stringify({ error: 'poltrona_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Testing ESP32 for poltrona: ${poltrona_id}`);

    // Buscar IP da poltrona
    const { data: poltrona, error: poltronaError } = await supabase
      .from('poltronas')
      .select('ip, poltrona_id')
      .eq('poltrona_id', poltrona_id)
      .maybeSingle();

    if (poltronaError || !poltrona) {
      console.error('Poltrona not found:', poltronaError);
      return new Response(
        JSON.stringify({ error: 'Poltrona não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!poltrona.ip) {
      return new Response(
        JSON.stringify({ error: 'IP não configurado para esta poltrona' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar POST para ESP32
    const esp32Url = `http://${poltrona.ip}/test`;
    console.log(`Sending test request to: ${esp32Url}`);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const esp32Response = await fetch(esp32Url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!esp32Response.ok) {
        throw new Error(`ESP32 responded with status ${esp32Response.status}`);
      }

      // Log do teste
      await supabase.from('logs').insert({
        poltrona_id: poltrona_id,
        message: 'Teste de relés iniciado remotamente'
      });

      console.log('Test request sent successfully');

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Teste enviado com sucesso. Os relés serão ativados por 10 segundos.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fetchError) {
      console.error('Failed to reach ESP32:', fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível conectar ao ESP32. Verifique se está online.',
          details: errorMessage
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in test-esp32-relay:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
