// api/mercadopago-qr-code.js
// Função para buscar QR code de um pagamento

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
    const { accessToken, paymentId } = req.body;

    if (!accessToken || !paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Token de acesso e ID do pagamento são obrigatórios'
      });
    }

    // Buscar QR code no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/qr_code`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({
        success: true,
        qr_code: data.qr_code
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Erro ao buscar QR code',
        details: data.message || `Status: ${response.status}`
      });
    }

  } catch (error) {
    console.error('Erro ao buscar QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
}
