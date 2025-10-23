import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

const MAX_NOTIFICATION_ATTEMPTS = 3;
const AMOUNT_TOLERANCE = 0.01;

// Função para validar assinatura do webhook do Mercado Pago
async function validateWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): Promise<boolean> {
  try {
    // Extrair partes da assinatura: ts=timestamp,v1=hash
    const parts = xSignature.split(',');
    let ts = '';
    let hash = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    }
    
    if (!ts || !hash) {
      console.error('Assinatura inválida: formato incorreto');
      return false;
    }
    
    // Criar manifesto: id:dataId;request-id:requestId;ts:timestamp;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Gerar HMAC SHA-256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const generatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Comparar hashes
    const isValid = generatedHash === hash;
    
    if (!isValid) {
      console.error('Assinatura inválida: hash não corresponde', {
        expected: hash,
        generated: generatedHash,
        manifest
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('Erro ao validar assinatura:', error);
    return false;
  }
}

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
    const accessToken = Deno.env.get('TOKEN_DE_ACESSO_DO_MERCADOPAGO');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');

    console.log('Environment check:', {
      hasAccessToken: !!accessToken,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      hasWebhookSecret: !!webhookSecret
    });

    if (!accessToken || !supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables:', {
        accessToken: !!accessToken,
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey
      });
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration incomplete',
          details: 'Missing required environment variables'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const webhookData = await req.json();

    console.log('Webhook received:', JSON.stringify(webhookData));

    // Validar assinatura do webhook (exceto para webhooks de teste)
    if (webhookData.live_mode !== false && webhookSecret) {
      const xSignature = req.headers.get('x-signature');
      const xRequestId = req.headers.get('x-request-id');
      const dataId = webhookData.data?.id?.toString();

      if (!xSignature || !xRequestId || !dataId) {
        console.error('Headers de assinatura ausentes:', {
          hasXSignature: !!xSignature,
          hasXRequestId: !!xRequestId,
          hasDataId: !!dataId
        });
        return new Response(
          JSON.stringify({ error: 'Missing signature headers' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      const isValidSignature = await validateWebhookSignature(
        xSignature,
        xRequestId,
        dataId,
        webhookSecret
      );

      if (!isValidSignature) {
        console.error('⚠️ TENTATIVA DE ACESSO NÃO AUTORIZADO - Assinatura inválida');
        await supabase.from('logs').insert({
          poltrona_id: null,
          message: '🚨 ALERTA DE SEGURANÇA: Webhook com assinatura inválida bloqueado'
        });
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        );
      }

      console.log('✅ Assinatura validada com sucesso');
    } else if (webhookData.live_mode === false) {
      console.log('ℹ️ Webhook de teste - validação de assinatura ignorada');
    }

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

    // Buscar configurações da poltrona (incluindo duração para sessão)
    const { data: poltrona, error: poltronaError } = await supabase
      .from('poltronas')
      .select('price, active, ip, payment_id, duration')
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
      const now = new Date();
      const sessionEndsAt = new Date(now.getTime() + (poltrona.duration * 1000));

      const paymentRecord = {
        payment_id: paymentId,
        poltrona_id: poltronaId,
        amount: paidAmount,
        status: 'approved',
        approved_at: now.toISOString(),
        processed: false,
        notification_attempts: 0
      };

      await supabase.from('payments').upsert(paymentRecord, {
        onConflict: 'payment_id'
      });

      // ATIVAR SESSÃO NA POLTRONA
      await supabase
        .from('poltronas')
        .update({
          session_active: true,
          session_started_at: now.toISOString(),
          session_ends_at: sessionEndsAt.toISOString(),
          current_payment_id: paymentId.toString()
        })
        .eq('poltrona_id', poltronaId);

      await supabase.from('logs').insert({
        poltrona_id: poltronaId,
        message: `✅ Pagamento aprovado: R$ ${paidAmount} - Sessão iniciada até ${sessionEndsAt.toLocaleTimeString('pt-BR')} - Payment ${paymentId}`
      });

      // Tentar notificar ESP32 com retry e duração
      await notifyESP32WithRetry(poltrona.ip, poltronaId, paymentId, poltrona.duration, supabase);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment approved and processed',
          amount: paidAmount,
          session_ends_at: sessionEndsAt.toISOString()
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
  duration: number,
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
        body: JSON.stringify({ 
          poltrona_id: poltronaId,
          payment_id: parseInt(paymentId)
        }),
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