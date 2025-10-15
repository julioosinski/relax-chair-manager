/*
 * API Segura para Mercado Pago
 * 
 * Usa Edge Functions para manter tokens seguros no servidor
 * NUNCA expõe tokens do Mercado Pago no cliente
 */

import { supabase } from "@/integrations/supabase/client";

interface MercadoPagoConfig {
  accessToken?: string; // Deprecated - não usar mais
  publicKey?: string;
  webhookUrl?: string;
}

interface PaymentResult {
  success: boolean;
  message: string;
  paymentId?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  amount?: number;
  details?: string;
}

/**
 * Testa conexão com Mercado Pago
 * Usa token do servidor (seguro)
 */
export const testMercadoPagoConnection = async (
  config: MercadoPagoConfig
): Promise<PaymentResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('mercadopago-test-connection', {
      body: {}
    });

    if (error) {
      return {
        success: false,
        message: 'Erro ao testar conexão',
        details: error.message
      };
    }

    return {
      success: data.success,
      message: data.message,
      details: data.details
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao testar conexão com Mercado Pago',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Cria pagamento PIX usando Edge Function segura
 * O token do Mercado Pago nunca sai do servidor
 */
export const generateCompleteQRCode = async (
  config: MercadoPagoConfig,
  poltronaId: string,
  amount: number,
  description: string
): Promise<PaymentResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('mercadopago-create-payment', {
      body: {
        poltronaId,
        amount,
        description,
        pixKey: '' // PIX key é obtida do backend
      }
    });

    if (error) {
      return {
        success: false,
        message: 'Erro ao comunicar com o servidor',
        details: error.message
      };
    }

    if (!data.success) {
      return {
        success: false,
        message: data.message || 'Erro ao gerar pagamento',
        details: data.details
      };
    }

    return {
      success: true,
      message: 'QR Code gerado com sucesso',
      paymentId: data.paymentId,
      qrCode: data.qrCode,
      qrCodeBase64: data.qrCodeBase64,
      amount: data.amount
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erro ao gerar QR Code',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

/**
 * Função mantida para compatibilidade, mas não faz nada
 * @deprecated Use edge functions
 */
export const fallbackTestConnection = async (
  config: MercadoPagoConfig
): Promise<PaymentResult> => {
  return {
    success: false,
    message: 'Use a função testMercadoPagoConnection',
    details: 'Esta função está deprecated'
  };
};
