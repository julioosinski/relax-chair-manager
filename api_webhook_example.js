/*
 * Exemplo de API Webhook para Mercado Pago
 * 
 * Este arquivo mostra como implementar o webhook do Mercado Pago
 * em diferentes plataformas (Vercel, Netlify, Express, etc.)
 */

// =============================================================================
// VERSÃO PARA VERCEL/NETLIFY (Serverless)
// =============================================================================

// Para Vercel: salve como api/webhook/mercadopago.js
// Para Netlify: salve como netlify/functions/webhook-mercadopago.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do Mercado Pago
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

// Handler principal (Vercel/Netlify)
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const webhookData = req.body;
    console.log('Webhook recebido:', JSON.stringify(webhookData, null, 2));

    // Processar webhook
    const result = await processWebhook(webhookData);
    
    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Webhook processado com sucesso',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}

// =============================================================================
// VERSÃO PARA EXPRESS.JS
// =============================================================================

const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Rota do webhook
app.post('/api/webhook/mercadopago', async (req, res) => {
  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const webhookData = req.body;
    console.log('Webhook recebido:', JSON.stringify(webhookData, null, 2));

    // Processar webhook
    const result = await processWebhook(webhookData);
    
    if (result.success) {
      res.status(200).json({ 
        success: true, 
        message: 'Webhook processado com sucesso',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// =============================================================================
// FUNÇÕES DE PROCESSAMENTO
// =============================================================================

async function processWebhook(webhookData) {
  try {
    const { type, data } = webhookData;
    
    if (type === 'payment') {
      return await processPaymentUpdate(data.id);
    }
    
    return {
      success: false,
      error: 'Tipo de webhook não suportado'
    };
    
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function processPaymentUpdate(paymentId) {
  try {
    console.log(`Processando pagamento: ${paymentId}`);

    // Verificar status no Mercado Pago
    const paymentStatus = await checkMercadoPagoPayment(paymentId);
    
    if (!paymentStatus.success) {
      console.error('Erro ao verificar pagamento:', paymentStatus.error);
      return { success: false, error: paymentStatus.error };
    }

    console.log('Status do pagamento:', paymentStatus);

    // Buscar pagamento no Supabase
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar pagamento:', fetchError);
      return { success: false, error: 'Erro ao buscar pagamento' };
    }

    // Se pagamento não existe, criar novo
    if (!existingPayment) {
      return await createNewPayment(paymentStatus);
    } else {
      // Atualizar pagamento existente
      return await updateExistingPayment(existingPayment, paymentStatus);
    }

  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    return { success: false, error: error.message };
  }
}

async function checkMercadoPagoPayment(paymentId) {
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    const payment = await response.json();
    
    return {
      success: true,
      paymentId: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
      approvedAt: payment.date_approved,
      externalReference: payment.external_reference,
      metadata: payment.metadata
    };

  } catch (error) {
    console.error('Erro ao verificar pagamento:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function createNewPayment(paymentStatus) {
  try {
    const { poltrona_id, amount, status, approvedAt } = extractPaymentData(paymentStatus);
    
    if (!poltrona_id) {
      console.error('Poltrona ID não encontrado');
      return { success: false, error: 'Poltrona ID não encontrado' };
    }

    // Validar valor do pagamento
    const validation = await validatePaymentValue(poltrona_id, amount);
    if (!validation.isValid) {
      console.error('Valor inválido:', validation);
      await logPaymentError(poltrona_id, `Valor inválido: esperado ${validation.expectedAmount}, recebido ${amount}`);
      return { success: false, error: 'Valor do pagamento inválido' };
    }

    // Criar pagamento no Supabase
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        payment_id: paymentStatus.paymentId,
        poltrona_id: poltrona_id,
        amount: amount,
        status: status,
        approved_at: status === 'approved' ? approvedAt : null,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Erro ao criar pagamento:', error);
      return { success: false, error: 'Erro ao criar pagamento' };
    }

    console.log('Pagamento criado:', data);

    // Se pagamento aprovado, notificar ESP32
    if (status === 'approved') {
      await notifyESP32(poltrona_id, paymentStatus.paymentId);
    }

    return { success: true };

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    return { success: false, error: error.message };
  }
}

async function updateExistingPayment(existingPayment, paymentStatus) {
  try {
    const { status, approvedAt } = extractPaymentData(paymentStatus);
    
    // Atualizar pagamento
    const { error } = await supabase
      .from('payments')
      .update({
        status: status,
        approved_at: status === 'approved' ? approvedAt : existingPayment.approved_at,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', paymentStatus.paymentId);

    if (error) {
      console.error('Erro ao atualizar pagamento:', error);
      return { success: false, error: 'Erro ao atualizar pagamento' };
    }

    console.log('Pagamento atualizado');

    // Se pagamento foi aprovado e não estava aprovado antes, notificar ESP32
    if (status === 'approved' && existingPayment.status !== 'approved') {
      await notifyESP32(existingPayment.poltrona_id, paymentStatus.paymentId);
    }

    return { success: true };

  } catch (error) {
    console.error('Erro ao atualizar pagamento:', error);
    return { success: false, error: error.message };
  }
}

function extractPaymentData(paymentStatus) {
  const metadata = paymentStatus.metadata || {};
  
  return {
    poltrona_id: metadata.poltrona_id,
    amount: paymentStatus.amount,
    status: mapMercadoPagoStatus(paymentStatus.status),
    approvedAt: paymentStatus.approvedAt
  };
}

function mapMercadoPagoStatus(mpStatus) {
  const statusMap = {
    'pending': 'pending',
    'approved': 'approved',
    'authorized': 'approved',
    'in_process': 'pending',
    'in_mediation': 'pending',
    'rejected': 'rejected',
    'cancelled': 'rejected',
    'refunded': 'rejected',
    'charged_back': 'rejected'
  };
  
  return statusMap[mpStatus] || 'pending';
}

async function validatePaymentValue(poltronaId, paymentAmount) {
  try {
    const { data: poltrona, error } = await supabase
      .from('poltronas')
      .select('price')
      .eq('poltrona_id', poltronaId)
      .single();

    if (error) {
      console.error('Erro ao buscar poltrona:', error);
      return { isValid: false, error: 'Poltrona não encontrada' };
    }

    const tolerance = 0.01; // 1 centavo
    const difference = Math.abs(paymentAmount - poltrona.price);
    
    return {
      isValid: difference <= tolerance,
      expectedAmount: poltrona.price,
      receivedAmount: paymentAmount,
      difference: difference
    };

  } catch (error) {
    console.error('Erro ao validar valor:', error);
    return { isValid: false, error: error.message };
  }
}

async function notifyESP32(poltronaId, paymentId) {
  try {
    // Buscar IP da poltrona
    const { data: poltrona, error } = await supabase
      .from('poltronas')
      .select('ip')
      .eq('poltrona_id', poltronaId)
      .single();

    if (error || !poltrona) {
      console.error('Erro ao buscar IP da poltrona:', error);
      return;
    }

    // Enviar notificação para ESP32
    const response = await fetch(`http://${poltrona.ip}:8080/api/payment-approved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentId: paymentId,
        poltronaId: poltronaId,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log(`ESP32 notificado: ${poltronaId}`);
      await logPaymentSuccess(poltronaId, paymentId);
    } else {
      console.error(`Erro ao notificar ESP32: ${response.status}`);
      await logPaymentError(poltronaId, `Falha na notificação ESP32: ${response.status}`);
    }

  } catch (error) {
    console.error('Erro ao notificar ESP32:', error);
    await logPaymentError(poltronaId, `Erro na notificação: ${error.message}`);
  }
}

async function logPaymentSuccess(poltronaId, paymentId) {
  try {
    await supabase
      .from('logs')
      .insert([{
        poltrona_id: poltronaId,
        message: `Pagamento aprovado e ESP32 notificado - Payment ID: ${paymentId}`
      }]);
  } catch (error) {
    console.error('Erro ao registrar log de sucesso:', error);
  }
}

async function logPaymentError(poltronaId, errorMessage) {
  try {
    await supabase
      .from('logs')
      .insert([{
        poltrona_id: poltronaId,
        message: `ERRO: ${errorMessage}`
      }]);
  } catch (error) {
    console.error('Erro ao registrar log de erro:', error);
  }
}

// =============================================================================
// CONFIGURAÇÃO DE AMBIENTE
// =============================================================================

/*
Variáveis de ambiente necessárias:

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima
MERCADOPAGO_ACCESS_TOKEN=seu-access-token

Para configurar no Mercado Pago:
1. Acesse o dashboard do Mercado Pago
2. Vá em "Desenvolvimento" > "Webhooks"
3. Adicione a URL: https://seu-dominio.com/api/webhook/mercadopago
4. Selecione os eventos: "payment"
5. Configure a autenticação com seu access token
*/
