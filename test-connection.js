// Script para testar conexão com Mercado Pago e Supabase
// Execute: node test-connection.js

import https from 'https';

// ✅ CREDENCIAIS CONFIGURADAS
const CONFIG = {
  SUPABASE_URL: 'https://pplaglcevtvlpzdnmvqd.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGFnbGNldnR2bHB6ZG5tdnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzOTYxOTgsImV4cCI6MjA3NTk3MjE5OH0.XE9rN4KAWT7Ng_Y-otAFZlP3j4bdRAt5qYh-SIwuFCw',
  MERCADOPAGO_TOKEN: 'APP_USR-2532798663353163-101409-41722b1525e26a2a3f1dadcb02086db1-13158573'
};

async function testSupabaseConnection() {
  console.log('🔍 Testando conexão com Supabase...');
  
  try {
    const response = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/poltronas?select=*&limit=1`, {
      headers: {
        'apikey': CONFIG.SUPABASE_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase: Conexão OK');
      return true;
    } else {
      console.log('❌ Supabase: Erro na conexão');
      console.log('Status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Supabase: Erro de rede');
    console.log('Erro:', error.message);
    return false;
  }
}

async function testMercadoPagoConnection() {
  console.log('🔍 Testando conexão com Mercado Pago...');
  
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: {
        'Authorization': `Bearer ${CONFIG.MERCADOPAGO_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Mercado Pago: Conexão OK');
      return true;
    } else {
      console.log('❌ Mercado Pago: Erro na conexão');
      console.log('Status:', response.status);
      const errorData = await response.text();
      console.log('Erro:', errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Mercado Pago: Erro de rede');
    console.log('Erro:', error.message);
    return false;
  }
}

async function testEdgeFunction() {
  console.log('🔍 Testando Edge Function...');
  
  try {
    const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/mercadopago-test-connection`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Edge Function: Conexão OK');
      console.log('Resposta:', data.message);
      return true;
    } else {
      console.log('❌ Edge Function: Erro na conexão');
      console.log('Status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Edge Function: Erro de rede');
    console.log('Erro:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes de conexão...\n');
  
  const supabaseOK = await testSupabaseConnection();
  console.log('');
  
  const mercadopagoOK = await testMercadoPagoConnection();
  console.log('');
  
  const edgeFunctionOK = await testEdgeFunction();
  console.log('');
  
  console.log('📊 Resultado dos Testes:');
  console.log(`Supabase: ${supabaseOK ? '✅' : '❌'}`);
  console.log(`Mercado Pago: ${mercadopagoOK ? '✅' : '❌'}`);
  console.log(`Edge Function: ${edgeFunctionOK ? '✅' : '❌'}`);
  
  if (supabaseOK && mercadopagoOK && edgeFunctionOK) {
    console.log('\n🎉 Todos os testes passaram! Sistema pronto para produção.');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique as configurações.');
  }
}

// Executar testes
runTests().catch(console.error);
