// api/mercadopago-create-payment.js
// Função para criar pagamentos PIX

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { config, payment } = req.body;

    if (!config?.accessToken || !payment) {
      return res.status(400).json({
        success: false,
        message: 'Configuração e dados do pagamento são obrigatórios'
      });
    }

    // Criar pagamento no Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `poltrona_${payment.metadata.poltrona_id}_${Date.now()}`
      },
      body: JSON.stringify(payment)
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({
        success: true,
        payment: data
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao criar pagamento',
        details: data.message || `Status: ${response.status}`
      });
    }

  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
}
