/*
 * API Proxy para Mercado Pago
 * 
 * Este arquivo cria funções que fazem requisições para o backend
 * em vez de chamar diretamente a API do Mercado Pago, evitando problemas de CORS
 */

interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  webhookUrl: string;
}

interface PaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  payer: {
    email: string;
  };
  external_reference: string;
  notification_url: string;
  auto_return: string;
  metadata: {
    poltrona_id: string;
    location: string;
    fixed_amount: boolean;
  };
}

interface PaymentResponse {
  id: string;
  status: string;
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  external_reference: string;
  created_at: string;
  status_detail: string;
  qr_code?: string;
  qr_code_base64?: string;
}

interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: string;
}

// Configuração base
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://relax-chair-manager.vercel.app/api';

/**
 * Testa a conexão com o Mercado Pago através do backend
 */
export const testMercadoPagoConnection = async (config: MercadoPagoConfig): Promise<TestConnectionResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/mercadopago/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        publicKey: config.publicKey,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: 'Conexão com Mercado Pago estabelecida',
        details: 'Token válido e API acessível'
      };
    } else {
      return {
        success: false,
        message: 'Falha na conexão com Mercado Pago',
        details: data.message || `Status: ${response.status}`
      };
    }
  } catch (error) {
    // Se der erro de DNS ou rede, usar fallback
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend não disponível, usando modo fallback');
      return fallbackTestConnection(config);
    }
    
    return {
      success: false,
      message: 'Erro ao conectar com Mercado Pago',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Gera um pagamento PIX via Mercado Pago através do backend
 */
export const createPixPayment = async (
  config: MercadoPagoConfig,
  poltronaId: string,
  amount: number,
  location: string
): Promise<PaymentResponse | null> => {
  try {
    const paymentRequest: PaymentRequest = {
      transaction_amount: amount,
      description: `Poltrona de Massagem - ${location}`,
      payment_method_id: 'pix',
      payer: {
        email: 'cliente@exemplo.com'
      },
      external_reference: `poltrona_${poltronaId}`,
      notification_url: config.webhookUrl,
      auto_return: 'approved',
      metadata: {
        poltrona_id: poltronaId,
        location: location,
        fixed_amount: true
      }
    };

    const response = await fetch(`${API_BASE_URL}/mercadopago/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config,
        payment: paymentRequest
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return data.payment;
    } else {
      throw new Error(data.message || 'Erro ao criar pagamento');
    }
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    return null;
  }
};

/**
 * Busca o QR Code de um pagamento através do backend
 */
export const getPaymentQRCode = async (
  config: MercadoPagoConfig,
  paymentId: string
): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/mercadopago/qr-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        paymentId
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return data.qr_code;
    } else {
      throw new Error(data.message || 'Erro ao buscar QR code');
    }
  } catch (error) {
    console.error('Erro ao buscar QR code:', error);
    return null;
  }
};

/**
 * Verifica o status de um pagamento através do backend
 */
export const getPaymentStatus = async (
  config: MercadoPagoConfig,
  paymentId: string
): Promise<PaymentResponse | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/mercadopago/payment-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        paymentId
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return data.payment;
    } else {
      throw new Error(data.message || 'Erro ao verificar status do pagamento');
    }
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return null;
  }
};

/**
 * Configura webhook no Mercado Pago através do backend
 */
export const configureWebhook = async (
  config: MercadoPagoConfig
): Promise<{ success: boolean; message: string; webhookId?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/mercadopago/configure-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessToken: config.accessToken,
        webhookUrl: config.webhookUrl
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: 'Webhook configurado com sucesso',
        webhookId: data.webhookId
      };
    } else {
      return {
        success: false,
        message: data.message || 'Erro ao configurar webhook'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Gera QR Code completo (pagamento + QR code) em uma única operação
 */
export const generateCompleteQRCode = async (
  config: MercadoPagoConfig,
  poltronaId: string,
  amount: number,
  location: string
): Promise<{
  success: boolean;
  paymentId?: string;
  qrCode?: string;
  message: string;
}> => {
  try {
    // Criar pagamento
    const payment = await createPixPayment(config, poltronaId, amount, location);
    
    if (!payment) {
      return {
        success: false,
        message: 'Erro ao criar pagamento'
      };
    }

    // Buscar QR code
    const qrCode = await getPaymentQRCode(config, payment.id);
    
    if (!qrCode) {
      return {
        success: false,
        message: 'Erro ao gerar QR code'
      };
    }

    return {
      success: true,
      paymentId: payment.id,
      qrCode: qrCode,
      message: 'QR Code gerado com sucesso'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Função de fallback para quando o backend não estiver disponível
export const fallbackTestConnection = async (config: MercadoPagoConfig): Promise<TestConnectionResponse> => {
  // Validar configuração básica
  if (!config.accessToken) {
    return {
      success: false,
      message: 'Token de acesso não configurado',
      details: 'Configure o token do Mercado Pago nas configurações'
    };
  }

  if (config.accessToken.length < 10) {
    return {
      success: false,
      message: 'Token de acesso inválido',
      details: 'Token deve ter pelo menos 10 caracteres'
    };
  }

  // Validar formato do token (deve começar com APP-)
  if (!config.accessToken.startsWith('APP-') && !config.accessToken.startsWith('TEST-')) {
    return {
      success: false,
      message: 'Formato do token inválido',
      details: 'Token deve começar com APP- ou TEST-'
    };
  }

  return {
    success: true,
    message: 'Configuração válida (modo offline)',
    details: 'Backend não disponível - usando configuração local. Para funcionalidade completa, faça deploy das funções serverless.'
  };
};
