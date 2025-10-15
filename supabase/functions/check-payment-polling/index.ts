import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_NOTIFICATION_ATTEMPTS = 3;
const NOTIFICATION_TIMEOUT = 5000;

async function notifyESP32WithRetry(
  esp32Ip: string, 
  poltronaId: string, 
  paymentId: number,
  supabase: any
): Promise<boolean> {
  let attempt = 0;
  
  while (attempt < MAX_NOTIFICATION_ATTEMPTS) {
    attempt++;
    console.log(`Attempt ${attempt}/${MAX_NOTIFICATION_ATTEMPTS} to notify ESP32 at ${esp32Ip}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NOTIFICATION_TIMEOUT);
      
      const response = await fetch(`http://${esp32Ip}/payment-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poltrona_id: poltronaId,
          payment_id: paymentId,
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Successfully notified ESP32 on attempt ${attempt}`);
        
        await supabase.from('payments').update({
          notified_at: new Date().toISOString(),
          notification_attempts: attempt
        }).eq('payment_id', paymentId);
        
        await supabase.from('logs').insert({
          poltrona_id: poltronaId,
          message: `ESP32 notificado com sucesso (tentativa ${attempt}/${MAX_NOTIFICATION_ATTEMPTS})`
        });
        
        return true;
      }
      
      console.log(`ESP32 returned status ${response.status} on attempt ${attempt}`);
      
    } catch (error: any) {
      console.error(`Failed to notify ESP32 on attempt ${attempt}:`, error.message);
      
      if (attempt === MAX_NOTIFICATION_ATTEMPTS) {
        await supabase.from('payments').update({
          notification_attempts: attempt
        }).eq('payment_id', paymentId);
        
        await supabase.from('logs').insert({
          poltrona_id: poltronaId,
          message: `Falha ao notificar ESP32 após ${MAX_NOTIFICATION_ATTEMPTS} tentativas: ${error.message}`
        });
      }
    }
    
    if (attempt < MAX_NOTIFICATION_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return false;
}

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
        JSON.stringify({ success: false, message: 'Server configuration incomplete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting payment polling check...');

    // Buscar pagamentos pendentes dos últimos 30 minutos
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: pendingPayments, error: fetchError } = await supabase
      .from('payments')
      .select('payment_id, poltrona_id, status, created_at')
      .eq('status', 'pending')
      .gte('created_at', thirtyMinutesAgo);

    if (fetchError) {
      console.error('Error fetching pending payments:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('No pending payments to check');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending payments',
          checked: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${pendingPayments.length} pending payments to check`);

    let approvedCount = 0;
    let rejectedCount = 0;

    // Verificar cada pagamento no Mercado Pago
    for (const payment of pendingPayments) {
      try {
        console.log(`Checking payment ${payment.payment_id} for poltrona ${payment.poltrona_id}`);
        
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${payment.payment_id}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!mpResponse.ok) {
          console.error(`Failed to fetch payment ${payment.payment_id}: ${mpResponse.status}`);
          continue;
        }

        const paymentData = await mpResponse.json();
        console.log(`Payment ${payment.payment_id} status: ${paymentData.status}`);

        if (paymentData.status === 'approved') {
          approvedCount++;
          
          // Atualizar status no banco
          await supabase.from('payments').update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            processed: true
          }).eq('payment_id', payment.payment_id);

          // Log do pagamento aprovado
          await supabase.from('logs').insert({
            poltrona_id: payment.poltrona_id,
            message: `Pagamento ${payment.payment_id} aprovado (R$ ${paymentData.transaction_amount}) - detectado por polling`
          });

          // Buscar IP do ESP32
          const { data: poltrona } = await supabase
            .from('poltronas')
            .select('ip')
            .eq('poltrona_id', payment.poltrona_id)
            .maybeSingle();

          if (poltrona?.ip) {
            await notifyESP32WithRetry(
              poltrona.ip,
              payment.poltrona_id,
              payment.payment_id,
              supabase
            );
          }

        } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
          rejectedCount++;
          
          await supabase.from('payments').update({
            status: paymentData.status,
            processed: true
          }).eq('payment_id', payment.payment_id);

          await supabase.from('logs').insert({
            poltrona_id: payment.poltrona_id,
            message: `Pagamento ${payment.payment_id} ${paymentData.status} - detectado por polling`
          });
        }

      } catch (error) {
        console.error(`Error checking payment ${payment.payment_id}:`, error);
      }
    }

    console.log(`Polling complete: ${approvedCount} approved, ${rejectedCount} rejected`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: pendingPayments.length,
        approved: approvedCount,
        rejected: rejectedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in check-payment-polling:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
