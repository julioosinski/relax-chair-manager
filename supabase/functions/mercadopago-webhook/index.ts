import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_NOTIFICATION_ATTEMPTS = 3;
const AMOUNT_TOLERANCE = 0.01;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration incomplete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const webhookData = await req.json();

    console.log('Webhook received:', JSON.stringify(webhookData));

    if (webhookData.type !== 'payment') {
      return new Response(
        JSON.stringify({ message: 'Not a payment notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      console.error('Payment ID not found in webhook');
      return new Response(
        JSON.stringify({ error: 'Payment ID missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se é notificação de teste (live_mode: false e ID fictício)
    if (webhookData.live_mode === false && webhookData.id) {
      console.log('Test webhook received - returning success');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test webhook received successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment from Mercado Pago');
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment details' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const payment = await paymentResponse.json();
    const poltronaId = payment.metadata?.poltrona_id;
    const paidAmount = parseFloat(payment.transaction_amount);
    const paymentStatus = payment.status;

    console.log(`Payment ${paymentId} - Status: ${paymentStatus}, Amount: ${paidAmount}, Poltrona: ${poltronaId}`);

    if (!poltronaId) {
      console.error('Poltrona ID not found in payment metadata');
      return new Response(
        JSON.stringify({ error: 'Poltrona ID missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar configurações da poltrona
    const { data: poltrona, error: poltronaError } = await supabase
      .from('poltronas')
      .select('price, active, ip, payment_id')
      .eq('poltrona_id', poltronaId)
      .single();

    if (poltronaError || !poltrona) {
      console.error('Poltrona not found:', poltronaError);
      await supabase.from('logs').insert({
        poltrona_id: poltronaId,
        message: `ERRO: Poltrona não encontrada no webhook - Payment ${paymentId}`
      });
      return new Response(
        JSON.stringify({ error: 'Poltrona not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!poltrona.active) {
      console.error('Poltrona is inactive');
      await supabase.from('logs').insert({
        poltrona_id: poltronaId,
        message: `ERRO: Pagamento recebido mas poltrona está inativa - Payment ${paymentId}`
      });
      return new Response(
        JSON.stringify({ error: 'Poltrona inactive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // VALIDAÇÃO RIGOROSA DO VALOR
    const expectedAmount = parseFloat(poltrona.price);
    const amountDifference = Math.abs(paidAmount - expectedAmount);

    if (amountDifference > AMOUNT_TOLERANCE) {
      console.error(`VALOR INCORRETO! Esperado: R$ ${expectedAmount}, Pago: R$ ${paidAmount}`);
      
      await supabase.from('logs').insert({
        poltrona_id: poltronaId,
        message: `⚠️ PAGAMENTO REJEITADO - Valor incorreto! Esperado: R$ ${expectedAmount}, Recebido: R$ ${paidAmount} - Payment ${paymentId}`
      });

      await supabase.from('payments').insert({
        payment_id: paymentId,
        poltrona_id: poltronaId,
        amount: paidAmount,
        status: 'rejected',
        processed: true
      });

      return new Response(
        JSON.stringify({ 
          error: 'Payment amount mismatch',
          expected: expectedAmount,
          received: paidAmount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verificar se pagamento já foi processado
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('processed')
      .eq('payment_id', paymentId)
      .single();

    if (existingPayment?.processed) {
      console.log('Payment already processed, skipping');
      return new Response(
        JSON.stringify({ message: 'Payment already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Processar pagamento aprovado
    if (paymentStatus === 'approved') {
      const paymentRecord = {
        payment_id: paymentId,
        poltrona_id: poltronaId,
        amount: paidAmount,
        status: 'approved',
        approved_at: new Date().toISOString(),
        processed: false,
        notification_attempts: 0
      };

      await supabase.from('payments').upsert(paymentRecord, {
        onConflict: 'payment_id'
      });

      await supabase.from('logs').insert({
        poltrona_id: poltronaId,
        message: `✅ Pagamento aprovado: R$ ${paidAmount} - Payment ${paymentId}`
      });

      // Tentar notificar ESP32 com retry
      await notifyESP32WithRetry(poltrona.ip, poltronaId, paymentId, supabase);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment approved and processed',
          amount: paidAmount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Registrar outros status
    await supabase.from('payments').upsert({
      payment_id: paymentId,
      poltrona_id: poltronaId,
      amount: paidAmount,
      status: paymentStatus,
      processed: true
    }, { onConflict: 'payment_id' });

    await supabase.from('logs').insert({
      poltrona_id: poltronaId,
      message: `Pagamento status: ${paymentStatus} - Payment ${paymentId}`
    });

    return new Response(
      JSON.stringify({ message: `Payment status: ${paymentStatus}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function notifyESP32WithRetry(
  ip: string, 
  poltronaId: string, 
  paymentId: string,
  supabase: any
) {
  for (let attempt = 1; attempt <= MAX_NOTIFICATION_ATTEMPTS; attempt++) {
    try {
      console.log(`Notifying ESP32 at ${ip} (attempt ${attempt}/${MAX_NOTIFICATION_ATTEMPTS})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`http://${ip}/payment-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`ESP32 notified successfully on attempt ${attempt}`);
        
        await supabase.from('payments').update({
          processed: true,
          notified_at: new Date().toISOString(),
          notification_attempts: attempt
        }).eq('payment_id', paymentId);

        await supabase.from('logs').insert({
          poltrona_id: poltronaId,
          message: `ESP32 notificado com sucesso (tentativa ${attempt})`
        });

        return true;
      }
    } catch (error) {
      console.error(`ESP32 notification attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_NOTIFICATION_ATTEMPTS) {
        await supabase.from('logs').insert({
          poltrona_id: poltronaId,
          message: `⚠️ FALHA ao notificar ESP32 após ${MAX_NOTIFICATION_ATTEMPTS} tentativas`
        });

        await supabase.from('payments').update({
          notification_attempts: attempt
        }).eq('payment_id', paymentId);
      }
    }

    if (attempt < MAX_NOTIFICATION_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }

  return false;
}