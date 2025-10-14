/*
 * Configuração do Mercado Pago para Sistema de Poltronas
 * 
 * Este arquivo contém as configurações e funções para integração
 * com a API do Mercado Pago para geração de QR codes fixos
 */

// Configurações do Mercado Pago
const MERCADOPAGO_CONFIG = {
  // Substitua pelas suas credenciais do Mercado Pago
  accessToken: 'TEST-1234567890-abcdef-1234567890abcdef-12345678', // Token de acesso
  publicKey: 'TEST-12345678-1234-1234-1234-123456789012', // Chave pública
  webhookUrl: 'https://seu-dominio.com/api/webhook/mercadopago', // URL do webhook
  baseUrl: 'https://api.mercadopago.com', // URL base da API
  sandbox: true // true para sandbox, false para produção
};

// Configurações das poltronas
const POLTRONA_CONFIG = {
  // Configuração padrão para cada poltrona
  defaultPrice: 10.00,
  currency: 'BRL',
  description: 'Poltrona de Massagem - {location}',
  externalReference: 'poltrona_{id}', // Referência externa única
  notificationUrl: MERCADOPAGO_CONFIG.webhookUrl,
  autoReturn: 'approved'
};

// Função para gerar QR code fixo para uma poltrona
async function generateFixedQRCode(poltronaId, price, location) {
  try {
    const response = await fetch(`${MERCADOPAGO_CONFIG.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `poltrona_${poltronaId}_${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: price,
        description: POLTRONA_CONFIG.description.replace('{location}', location),
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@exemplo.com' // Email genérico para PIX
        },
        external_reference: POLTRONA_CONFIG.externalReference.replace('{id}', poltronaId),
        notification_url: POLTRONA_CONFIG.notificationUrl,
        auto_return: POLTRONA_CONFIG.autoReturn,
        metadata: {
          poltrona_id: poltronaId,
          location: location,
          fixed_amount: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    const payment = await response.json();
    
    // Gerar QR code usando a API do Mercado Pago
    const qrResponse = await fetch(`${MERCADOPAGO_CONFIG.baseUrl}/v1/payments/${payment.id}/qr_code`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_CONFIG.accessToken}`
      }
    });

    if (!qrResponse.ok) {
      throw new Error(`Erro ao gerar QR code: ${qrResponse.status}`);
    }

    const qrData = await qrResponse.json();

    return {
      success: true,
      paymentId: payment.id,
      qrCode: qrData.qr_code,
      qrCodeBase64: qrData.qr_code_base64,
      amount: price,
      poltronaId: poltronaId,
      status: payment.status,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Erro ao gerar QR code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Função para verificar status do pagamento
async function checkPaymentStatus(paymentId) {
  try {
    const response = await fetch(`${MERCADOPAGO_CONFIG.baseUrl}/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_CONFIG.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao verificar pagamento: ${response.status}`);
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

// Função para validar valor do pagamento
function validatePaymentAmount(paymentAmount, expectedAmount) {
  const tolerance = 0.01; // Tolerância de 1 centavo
  const difference = Math.abs(paymentAmount - expectedAmount);
  
  return {
    isValid: difference <= tolerance,
    difference: difference,
    expectedAmount: expectedAmount,
    receivedAmount: paymentAmount
  };
}

// Função para processar webhook do Mercado Pago
function processWebhook(webhookData) {
  try {
    const { type, data } = webhookData;
    
    if (type === 'payment') {
      return {
        success: true,
        paymentId: data.id,
        type: 'payment_update',
        requiresVerification: true
      };
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

// Função para criar QR code visual (usando biblioteca qrcode)
function generateQRCodeImage(qrCodeData) {
  // Esta função seria implementada no frontend para gerar a imagem do QR code
  // usando uma biblioteca como qrcode.js
  return {
    qrCodeData: qrCodeData,
    instructions: 'Use uma biblioteca QR code para gerar a imagem'
  };
}

// Função para configurar webhook no Mercado Pago
async function configureWebhook() {
  try {
    const response = await fetch(`${MERCADOPAGO_CONFIG.baseUrl}/v1/webhooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCADOPAGO_CONFIG.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: MERCADOPAGO_CONFIG.webhookUrl,
        events: ['payment']
      })
    });

    if (!response.ok) {
      throw new Error(`Erro ao configurar webhook: ${response.status}`);
    }

    const webhook = await response.json();
    return {
      success: true,
      webhookId: webhook.id,
      url: webhook.url,
      events: webhook.events
    };

  } catch (error) {
    console.error('Erro ao configurar webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Exportar funções para uso em outros módulos
module.exports = {
  MERCADOPAGO_CONFIG,
  POLTRONA_CONFIG,
  generateFixedQRCode,
  checkPaymentStatus,
  validatePaymentAmount,
  processWebhook,
  generateQRCodeImage,
  configureWebhook
};

// Para uso em navegador (se necessário)
if (typeof window !== 'undefined') {
  window.MercadoPagoConfig = {
    MERCADOPAGO_CONFIG,
    POLTRONA_CONFIG,
    generateFixedQRCode,
    checkPaymentStatus,
    validatePaymentAmount,
    processWebhook,
    generateQRCodeImage,
    configureWebhook
  };
}
