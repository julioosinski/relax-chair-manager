// test-webhook.js
// Script para testar o webhook do Mercado Pago

const WEBHOOK_URL = 'https://relax-chair-manager.vercel.app/api/mercadopago-webhook';

async function testWebhook() {
  console.log('🧪 Testando webhook do Mercado Pago...\n');

  // Teste 1: Verificar se a URL está acessível
  console.log('1️⃣ Testando acessibilidade da URL...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ URL acessível - Status:', response.status);
    } else {
      console.log('❌ URL não acessível - Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Erro ao acessar URL:', error.message);
  }

  // Teste 2: Simular notificação de pagamento
  console.log('\n2️⃣ Testando notificação de pagamento...');
  try {
    const testPayload = {
      type: 'payment',
      data: {
        id: '123456789'
      }
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': 'test-signature',
        'x-request-id': 'test-request-id'
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook funcionando - Status:', response.status);
      console.log('📄 Resposta:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Erro no webhook - Status:', response.status);
      console.log('📄 Erro:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('❌ Erro ao testar webhook:', error.message);
  }

  // Teste 3: Verificar headers CORS
  console.log('\n3️⃣ Verificando headers CORS...');
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://relax-chair-manager.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    };

    console.log('📋 Headers CORS:', JSON.stringify(corsHeaders, null, 2));
    
    if (corsHeaders['Access-Control-Allow-Origin'] === '*') {
      console.log('✅ CORS configurado corretamente');
    } else {
      console.log('⚠️ CORS pode ter problemas');
    }
  } catch (error) {
    console.log('❌ Erro ao verificar CORS:', error.message);
  }

  console.log('\n🏁 Teste concluído!');
  console.log('\n📝 Próximos passos:');
  console.log('1. Configure o webhook no dashboard do Mercado Pago');
  console.log('2. Use a URL:', WEBHOOK_URL);
  console.log('3. Selecione os eventos: payment e payment.updated');
  console.log('4. Teste com um pagamento real');
}

// Executar teste
testWebhook().catch(console.error);
