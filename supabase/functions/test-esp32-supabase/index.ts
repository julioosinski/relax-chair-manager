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

    // Criar um registro de teste na tabela de pagamentos
    const { data: testPayment, error: insertError } = await supabase
      .from('payments')
      .insert({
        payment_id: `TEST_${Date.now()}`,
        poltrona_id: poltrona_id,
        amount: 0.01,
        status: 'approved',
        approved_at: new Date().toISOString(),
        processed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating test payment:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar pagamento de teste' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log do teste
    await supabase.from('logs').insert({
      poltrona_id: poltrona_id,
      message: `Teste de relés iniciado remotamente - Payment ID: ${testPayment.payment_id}`
    });

    console.log('Test payment created successfully:', testPayment.payment_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Teste enviado com sucesso! O ESP32 deve detectar o pagamento via polling e ativar os relés por 10 segundos.',
        test_payment_id: testPayment.payment_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in test-esp32-supabase:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
