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
    const { poltrona_id, firmware_version, wifi_signal, uptime_seconds } = await req.json();

    if (!poltrona_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'poltrona_id é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`💓 Heartbeat recebido de ${poltrona_id}:`, {
      firmware_version,
      wifi_signal,
      uptime_seconds,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // UPSERT no status da poltrona
    const { error: upsertError } = await supabase
      .from('poltrona_status')
      .upsert(
        {
          poltrona_id,
          is_online: true,
          last_ping: new Date().toISOString(),
          firmware_version: firmware_version || null,
          wifi_signal: wifi_signal || null,
          uptime_seconds: uptime_seconds || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'poltrona_id' }
      );

    if (upsertError) {
      console.error('❌ Erro ao atualizar status:', upsertError);
      return new Response(
        JSON.stringify({ success: false, message: 'Erro ao atualizar status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`✅ Status de ${poltrona_id} atualizado com sucesso`);

    return new Response(
      JSON.stringify({ success: true, message: 'Heartbeat registrado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro no heartbeat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
