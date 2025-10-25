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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration incomplete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { poltronaId } = await req.json();

    if (!poltronaId) {
      return new Response(
        JSON.stringify({ error: 'poltronaId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`🔍 Checking payment status for poltrona ${poltronaId}`);

    // Buscar configuração da poltrona para obter a duração
    const { data: poltronaConfig } = await supabase
      .from('poltronas')
      .select('duration')
      .eq('poltrona_id', poltronaId)
      .single();

    // Buscar pagamentos aprovados que ainda não foram notificados E não processados
    const { data: pendingPayments, error } = await supabase
      .from('payments')
      .select('payment_id, amount, approved_at')
      .eq('poltrona_id', poltronaId)
      .eq('status', 'approved')
      .is('notified_at', null)
      .eq('processed', false)
      .order('approved_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('❌ Error checking payments:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`📊 Found ${pendingPayments?.length || 0} pending payment(s) for ${poltronaId}`);

    if (pendingPayments && pendingPayments.length > 0) {
      const payment = pendingPayments[0];
      
      console.log(`✅ Found pending payment ${payment.payment_id} for poltrona ${poltronaId} - Amount: R$ ${payment.amount}`);

      // Marcar como notificado (sem marcar como processado)
      await supabase
        .from('payments')
        .update({ 
          notified_at: new Date().toISOString()
        })
        .eq('payment_id', payment.payment_id);

      // Registrar log
      await supabase.from('logs').insert({
        poltrona_id: poltronaId,
        message: `ESP32 verificou e processou pagamento ${payment.payment_id} via polling`
      });

      console.log(`📤 Returning payment to ESP32: ${payment.payment_id}`);

      // Criar sessão ativa
      await supabase
        .from('poltrona_sessions')
        .upsert({
          poltrona_id: poltronaId,
          payment_id: payment.payment_id,
          started_at: new Date().toISOString(),
          expected_end_at: new Date(Date.now() + (poltronaConfig?.duration || 900) * 1000).toISOString(),
          active: true
        });

      return new Response(
        JSON.stringify({
          hasPendingPayment: true,
          paymentId: payment.payment_id,
          amount: payment.amount,
          approvedAt: payment.approved_at,
          duration: poltronaConfig?.duration || 900
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`⭕ No pending payments for ${poltronaId}`);

    // Nenhum pagamento pendente
    return new Response(
      JSON.stringify({ hasPendingPayment: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in check-payment-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});