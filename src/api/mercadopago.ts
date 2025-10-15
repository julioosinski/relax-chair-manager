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
  poltronaId: string
): Promise<PaymentResult> => {
  try {
    console.log('Generating fixed QR Code via secure edge function:', { poltronaId });

    const { data, error } = await supabase.functions.invoke('mercadopago-create-payment', {
      body: { poltronaId }
    });

    if (error) {
      console.error('Edge function error:', error);
      return {
        success: false,
        message: error.message || 'Erro ao chamar função de pagamento'
      };
    }

    if (!data.success) {
      console.error('Payment creation failed:', data);
      return {
        success: false,
        message: data.message || 'Erro ao criar pagamento'
      };
    }

    console.log('Fixed QR Code generated successfully:', data.paymentId);

    return {
      success: true,
      message: data.message || 'QR Code fixo gerado com sucesso',
      paymentId: data.paymentId,
      qrCode: data.qrCode,
      qrCodeBase64: data.qrCodeBase64,
      amount: data.amount
    };

  } catch (error) {
    console.error('Error generating QR code:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido ao gerar QR Code'
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
