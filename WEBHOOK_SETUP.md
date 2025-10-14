# 🔗 Configuração do Webhook Mercado Pago

## 📋 Pré-requisitos

1. ✅ Projeto deployado no Vercel
2. ✅ Domínio: `relax-chair-manager.vercel.app`
3. ✅ Token do Mercado Pago configurado

## 🚀 Passo a Passo

### 1. **Deploy no Vercel**

```bash
# Fazer deploy das funções
vercel --prod

# Ou via GitHub (recomendado)
git push origin main
```

### 2. **Configurar Variáveis de Ambiente no Vercel**

No painel do Vercel:
1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   ```
   MERCADOPAGO_ACCESS_TOKEN = seu_token_aqui
   ```

### 3. **URL do Webhook**

```
https://relax-chair-manager.vercel.app/api/mercadopago-webhook
```

### 4. **Configurar no Mercado Pago**

#### **4.1. Acessar Dashboard do Mercado Pago**
1. Acesse: https://www.mercadopago.com.br/developers
2. Faça login na sua conta
3. Vá em **Suas integrações**

#### **4.2. Configurar Webhook**
1. Clique na sua aplicação
2. Vá em **Webhooks**
3. Clique em **Configurar webhooks**
4. Adicione a URL:
   ```
   https://relax-chair-manager.vercel.app/api/mercadopago-webhook
   ```
5. Selecione os eventos:
   - ✅ `payment` (Pagamento aprovado/rejeitado)
   - ✅ `payment.updated` (Atualização de status)

#### **4.3. Testar Webhook**
1. Clique em **Testar webhook**
2. Verifique se retorna status 200
3. Confirme que a URL está acessível

### 5. **Verificar Funcionamento**

#### **5.1. Teste Manual**
```bash
curl -X POST https://relax-chair-manager.vercel.app/api/mercadopago-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456789"}}'
```

#### **5.2. Logs do Vercel**
1. Acesse o painel do Vercel
2. Vá em **Functions**
3. Clique em `mercadopago-webhook`
4. Verifique os logs em tempo real

## 🔧 Troubleshooting

### **Erro: Webhook não válido**

#### **Causa 1: URL não acessível**
```bash
# Testar se a URL responde
curl -I https://relax-chair-manager.vercel.app/api/mercadopago-webhook
```

#### **Causa 2: Função não deployada**
- Verifique se o arquivo `api/mercadopago-webhook.js` existe
- Confirme o deploy no Vercel

#### **Causa 3: CORS**
- A função já está configurada para aceitar CORS
- Verifique se não há bloqueios de firewall

### **Erro: Token não configurado**

1. **No Vercel:**
   - Settings → Environment Variables
   - Adicione `MERCADOPAGO_ACCESS_TOKEN`

2. **Na aplicação:**
   - Configure o token na página de configurações

### **Erro: Timeout**

- O webhook tem timeout de 10 segundos
- Para pagamentos complexos, aumente no `vercel.json`

## 📊 Monitoramento

### **Logs em Tempo Real**
```bash
# Via Vercel CLI
vercel logs --follow

# Via Dashboard
https://vercel.com/dashboard
```

### **Métricas**
- Taxa de sucesso do webhook
- Tempo de resposta
- Erros de processamento

## 🔐 Segurança

### **Validação de Assinatura (Opcional)**
```javascript
// Adicionar no webhook se necessário
const signature = req.headers['x-signature'];
const isValid = validateSignature(req.body, signature);
```

### **Rate Limiting**
- Vercel já aplica rate limiting automático
- Webhook processa até 1000 requisições/minuto

## 📱 Integração com ESP32

### **Notificação do Pagamento**
```javascript
// No webhook, quando pagamento aprovado
if (payment.status === 'approved') {
  // Notificar ESP32
  await notifyESP32(payment.external_reference);
}
```

### **URL do ESP32**
```
http://IP_DO_ESP32:8080/payment-approved
```

## ✅ Checklist Final

- [ ] Projeto deployado no Vercel
- [ ] Variável `MERCADOPAGO_ACCESS_TOKEN` configurada
- [ ] Webhook configurado no Mercado Pago
- [ ] URL testada e funcionando
- [ ] Eventos `payment` e `payment.updated` selecionados
- [ ] Teste manual realizado com sucesso
- [ ] Logs sendo monitorados

## 🆘 Suporte

Se ainda houver problemas:

1. **Verifique os logs** do Vercel
2. **Teste a URL** manualmente
3. **Confirme as variáveis** de ambiente
4. **Valide o token** do Mercado Pago
5. **Verifique a configuração** do webhook no dashboard

---

**URL Final do Webhook:**
```
https://relax-chair-manager.vercel.app/api/mercadopago-webhook
```
