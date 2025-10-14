/*
 * Webhook Handler para Mercado Pago
 * 
 * Este arquivo processa as notificações do Mercado Pago
 * e atualiza o status dos pagamentos no Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const { processWebhook, checkPaymentStatus, validatePaymentAmount } = require('./mercadopago_config');

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sua-chave-anonima';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração do Mercado Pago
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || 'seu-access-token';

/**
 * Handler principal do webhook
 */
async function handleWebhook(req, res) {
  try {
    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    // Verificar autenticação (opcional, mas recomendado)
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Processar dados do webhook
    const webhookData = req.body;
    console.log('Webhook recebido:', JSON.stringify(webhookData, null, 2));

    // Processar webhook
    const webhookResult = processWebhook(webhookData);
    
    if (!webhookResult.success) {
      console.error('Erro ao processar webhook:', webhookResult.error);
      return res.status(400).json({ error: webhookResult.error });
    }

    // Se for uma atualização de pagamento, verificar status
    if (webhookResult.type === 'payment_update' && webhookResult.requiresVerification) {
      await processPaymentUpdate(webhookResult.paymentId);
    }

    // Responder com sucesso
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no webhook handler:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
}

/**
 * Processa atualização de pagamento
 */
async function processPaymentUpdate(paymentId) {
  try {
    console.log(`Processando atualização do pagamento: ${paymentId}`);

    // Verificar status do pagamento no Mercado Pago
    const paymentStatus = await checkPaymentStatus(paymentId);
    
    if (!paymentStatus.success) {
      console.error('Erro ao verificar status do pagamento:', paymentStatus.error);
      return;
    }

    console.log('Status do pagamento:', paymentStatus);

    // Buscar pagamento no Supabase
    const { data: existingPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar pagamento no Supabase:', fetchError);
      return;
    }

    // Se pagamento não existe, criar novo
    if (!existingPayment) {
      await createNewPayment(paymentStatus);
    } else {
      // Atualizar pagamento existente
      await updateExistingPayment(existingPayment, paymentStatus);
    }

  } catch (error) {
    console.error('Erro ao processar atualização de pagamento:', error);
  }
}

/**
 * Cria novo pagamento no Supabase
 */
async function createNewPayment(paymentStatus) {
  try {
    const { poltrona_id, amount, status, approvedAt } = extractPaymentData(paymentStatus);
    
    if (!poltrona_id) {
      console.error('Poltrona ID não encontrado no pagamento');
      return;
    }

    // Validar valor do pagamento
    const validation = await validatePaymentValue(poltrona_id, amount);
    if (!validation.isValid) {
      console.error('Valor do pagamento inválido:', validation);
      await logPaymentError(poltrona_id, `Valor inválido: esperado ${validation.expectedAmount}, recebido ${amount}`);
      return;
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
      console.error('Erro ao criar pagamento no Supabase:', error);
      return;
    }

    console.log('Pagamento criado com sucesso:', data);

    // Se pagamento aprovado, notificar ESP32
    if (status === 'approved') {
      await notifyESP32(poltrona_id, paymentStatus.paymentId);
    }

  } catch (error) {
    console.error('Erro ao criar novo pagamento:', error);
  }
}

/**
 * Atualiza pagamento existente no Supabase
 */
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
      return;
    }

    console.log('Pagamento atualizado com sucesso');

    // Se pagamento foi aprovado e não estava aprovado antes, notificar ESP32
    if (status === 'approved' && existingPayment.status !== 'approved') {
      await notifyESP32(existingPayment.poltrona_id, paymentStatus.paymentId);
    }

  } catch (error) {
    console.error('Erro ao atualizar pagamento existente:', error);
  }
}

/**
 * Extrai dados do pagamento do status retornado pelo Mercado Pago
 */
function extractPaymentData(paymentStatus) {
  const metadata = paymentStatus.metadata || {};
  
  return {
    poltrona_id: metadata.poltrona_id,
    amount: paymentStatus.amount,
    status: mapMercadoPagoStatus(paymentStatus.status),
    approvedAt: paymentStatus.approvedAt
  };
}

/**
 * Mapeia status do Mercado Pago para status interno
 */
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

/**
 * Valida valor do pagamento contra configuração da poltrona
 */
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

    const validation = validatePaymentAmount(paymentAmount, poltrona.price);
    
    return {
      isValid: validation.isValid,
      expectedAmount: validation.expectedAmount,
      receivedAmount: validation.receivedAmount,
      difference: validation.difference
    };

  } catch (error) {
    console.error('Erro ao validar valor do pagamento:', error);
    return { isValid: false, error: error.message };
  }
}

/**
 * Notifica ESP32 sobre pagamento aprovado
 */
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
    const response = await fetch(`http://${poltrona.ip}/api/payment-approved`, {
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
      console.log(`ESP32 notificado com sucesso: ${poltronaId}`);
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

/**
 * Registra log de sucesso
 */
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

/**
 * Registra log de erro
 */
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

// Exportar handler para uso em diferentes frameworks
module.exports = {
  handleWebhook,
  processPaymentUpdate,
  createNewPayment,
  updateExistingPayment
};

// Para uso em Vercel/Netlify
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = handleWebhook;
}
