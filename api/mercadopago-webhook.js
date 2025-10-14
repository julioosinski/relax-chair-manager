// api/mercadopago-webhook.js
// Webhook handler para notificações do Mercado Pago

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-signature, x-request-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { type, data } = req.body;

    console.log('Webhook recebido:', { type, data });

    if (type === 'payment') {
      const paymentId = data.id;
      
      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: 'ID do pagamento não encontrado'
        });
      }

      // Buscar informações do pagamento
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      
      if (!accessToken) {
        console.error('Token do Mercado Pago não configurado');
        return res.status(500).json({
          success: false,
          message: 'Token do Mercado Pago não configurado'
        });
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!paymentResponse.ok) {
        console.error('Erro ao buscar pagamento:', paymentResponse.status);
        return res.status(400).json({
          success: false,
          message: 'Erro ao buscar informações do pagamento'
        });
      }

      const payment = await paymentResponse.json();
      
      console.log('Pagamento processado:', {
        id: payment.id,
        status: payment.status,
        status_detail: payment.status_detail,
        external_reference: payment.external_reference
      });

      // Processar baseado no status
      if (payment.status === 'approved') {
        console.log('Pagamento aprovado:', payment.id);
        
        // Aqui você pode adicionar lógica para:
        // 1. Atualizar o banco de dados
        // 2. Notificar o ESP32
        // 3. Enviar confirmação por email
        
        // Exemplo de resposta para o ESP32
        const response = {
          success: true,
          payment_id: payment.id,
          status: 'approved',
          amount: payment.transaction_amount,
          external_reference: payment.external_reference,
          message: 'Pagamento aprovado com sucesso'
        };

        return res.status(200).json(response);
      } else if (payment.status === 'rejected') {
        console.log('Pagamento rejeitado:', payment.id);
        
        return res.status(200).json({
          success: true,
          payment_id: payment.id,
          status: 'rejected',
          message: 'Pagamento rejeitado'
        });
      } else {
        console.log('Status do pagamento:', payment.status);
        
        return res.status(200).json({
          success: true,
          payment_id: payment.id,
          status: payment.status,
          message: `Status: ${payment.status}`
        });
      }
    }

    // Para outros tipos de notificação
    return res.status(200).json({
      success: true,
      message: 'Webhook processado',
      type: type
    });

  } catch (error) {
    console.error('Erro no webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
}
