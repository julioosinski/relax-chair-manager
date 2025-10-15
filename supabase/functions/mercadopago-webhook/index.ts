import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    
    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Token não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Validar assinatura do webhook (x-signature)
    const signature = req.headers.get('x-signature');
    const requestId = req.headers.get('x-request-id');
    
    if (!signature) {
      console.warn('Webhook received without signature');
      // Em produção, você pode querer rejeitar webhooks sem assinatura
    }

    const body = await req.json();
    const { type, data } = body;

    console.log(`Webhook received - Type: ${type}, Data:`, data);

    // Processar apenas notificações de pagamento
    if (type !== 'payment') {
      console.log(`Ignoring webhook type: ${type}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Tipo de webhook não processado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.error('Payment ID not found in webhook data');
      return new Response(
        JSON.stringify({ error: 'ID do pagamento não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar detalhes do pagamento no Mercado Pago
    console.log(`Fetching payment details for ID: ${paymentId}`);
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!paymentResponse.ok) {
      console.error(`Failed to fetch payment ${paymentId}: ${paymentResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados do pagamento' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const payment = await paymentResponse.json();
    console.log(`Payment fetched - Status: ${payment.status}, Amount: ${payment.transaction_amount}`);

    // Extrair informações relevantes
    const poltronaId = payment.metadata?.poltrona_id;
    const status = payment.status; // approved, rejected, pending, etc.
    const amount = payment.transaction_amount;

    if (!poltronaId) {
      console.error('Poltrona ID not found in payment metadata');
      return new Response(
        JSON.stringify({ error: 'ID da poltrona não encontrado nos metadados' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Criar cliente Supabase com service role para bypass de RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Inserir ou atualizar pagamento no banco de dados
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing payment:', fetchError);
    }

    if (existingPayment) {
      // Atualizar pagamento existente
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: status,
          approved_at: status === 'approved' ? new Date().toISOString() : existingPayment.approved_at
        })
        .eq('payment_id', paymentId);

      if (updateError) {
        console.error('Error updating payment:', updateError);
      } else {
        console.log(`Payment ${paymentId} updated successfully`);
      }
    } else {
      // Criar novo pagamento
      const { error: insertError } = await supabase
        .from('payments')
        .insert({
          payment_id: paymentId,
          poltrona_id: poltronaId,
          amount: amount,
          status: status,
          approved_at: status === 'approved' ? new Date().toISOString() : null
        });

      if (insertError) {
        console.error('Error inserting payment:', insertError);
      } else {
        console.log(`Payment ${paymentId} created successfully`);
      }
    }

    // Registrar log
    const { error: logError } = await supabase
      .from('logs')
      .insert({
        poltrona_id: poltronaId,
        message: `Webhook processado - Payment ${paymentId}: ${status} - R$ ${amount}`
      });

    if (logError) {
      console.error('Error inserting log:', logError);
    }

    // Se pagamento aprovado, notificar ESP32 (opcional)
    if (status === 'approved') {
      console.log(`Payment approved for poltrona ${poltronaId}`);
      
      // Buscar IP da poltrona
      const { data: poltrona } = await supabase
        .from('poltronas')
        .select('ip')
        .eq('poltrona_id', poltronaId)
        .maybeSingle();

      if (poltrona?.ip) {
        try {
          await fetch(`http://${poltrona.ip}/api/payment-approved`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              poltronaId,
              amount,
              timestamp: new Date().toISOString()
            })
          });
          console.log(`ESP32 notified successfully for poltrona ${poltronaId}`);
        } catch (espError) {
          console.error(`Failed to notify ESP32 for poltrona ${poltronaId}:`, espError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processado com sucesso',
        paymentId,
        status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in webhook handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: errorMessage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
