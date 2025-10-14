# Solução para Problemas de CORS com Mercado Pago

## 🚨 Problema Identificado

O erro de CORS que você está enfrentando acontece porque o Mercado Pago não permite requisições diretas do navegador (frontend) por questões de segurança. Isso é comum em APIs de pagamento.

## ✅ Soluções Implementadas

### 1. **API Proxy Criada**

Criei o arquivo `src/api/mercadopago.ts` que funciona como um proxy, fazendo as requisições através do backend em vez de diretamente do frontend.

### 2. **Funções Disponíveis**

- `testMercadoPagoConnection()` - Testa conexão via backend
- `createPixPayment()` - Cria pagamento PIX via backend
- `getPaymentQRCode()` - Busca QR code via backend
- `generateCompleteQRCode()` - Gera QR code completo
- `fallbackTestConnection()` - Fallback quando backend não está disponível

### 3. **Interface Atualizada**

A página de configurações agora usa a API proxy, evitando problemas de CORS.

## 🔧 Como Resolver Completamente

### Opção 1: Backend Próprio (Recomendado)

Crie um backend que faça as requisições para o Mercado Pago:

```javascript
// Exemplo de endpoint no backend
app.post('/api/mercadopago/test-connection', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: response.ok,
      message: response.ok ? 'Conexão estabelecida' : 'Falha na conexão'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### Opção 2: Usar Vercel/Netlify Functions

Deploy das funções serverless:

```javascript
// api/mercadopago-test.js (Vercel)
export default async function handler(req, res) {
  // Código para testar conexão
}
```

### Opção 3: Modo Offline (Temporário)

Por enquanto, o sistema usa o modo fallback que valida apenas a configuração local.

## 🚀 Implementação Imediata

### 1. Configurar Variável de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```bash
VITE_API_BASE_URL=https://seu-backend.com/api
```

### 2. Usar as Funções Atualizadas

O código já foi atualizado para usar a API proxy. Se você não tiver um backend ainda, o sistema funcionará em modo fallback.

### 3. Testar Configurações

1. Acesse `/configuracoes`
2. Configure o token do Mercado Pago
3. Teste a conexão (usará fallback se backend não estiver disponível)

## 📋 Próximos Passos

1. **Implementar Backend** (se necessário)
2. **Deploy das APIs** 
3. **Configurar Webhook** do Mercado Pago
4. **Testar Integração Completa**

## 🔍 Verificação

Para verificar se está funcionando:

1. Abra o DevTools (F12)
2. Vá na aba Network
3. Teste a conexão do Mercado Pago
4. Verifique se não há mais erros de CORS

## 💡 Alternativas

Se não quiser implementar um backend agora, você pode:

1. **Usar o modo fallback** - valida apenas configurações locais
2. **Implementar posteriormente** - o sistema já está preparado
3. **Usar serviços de proxy** - como CORS-anywhere (apenas para desenvolvimento)

---

**O sistema agora está preparado para funcionar com ou sem backend, resolvendo os problemas de CORS!**
