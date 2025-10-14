// api/mercadopago-test.js
// Exemplo de função serverless para Vercel/Netlify

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
    const { accessToken, publicKey } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Token de acesso é obrigatório'
      });
    }

    // Testar conexão com Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      res.status(200).json({
        success: true,
        message: 'Conexão com Mercado Pago estabelecida',
        details: 'Token válido e API acessível'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Falha na conexão com Mercado Pago',
        details: `Status: ${response.status} - ${response.statusText}`
      });
    }

  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
}
