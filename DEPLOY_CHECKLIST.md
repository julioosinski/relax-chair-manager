# ✅ Checklist de Deploy - Relax Chair Manager

## 🎯 Status do Projeto

### **✅ Configurações Completas**
- [x] `vercel.json` configurado
- [x] `package.json` com scripts corretos
- [x] `.vercelignore` criado
- [x] Build local testado com sucesso
- [x] Dependências instaladas
- [x] Repositório atualizado

### **✅ Estrutura de Arquivos**
```
relax-chair-manager/
├── api/                          ✅ Funções serverless
│   ├── mercadopago-test.js       ✅ Teste de conexão
│   ├── mercadopago-webhook.js    ✅ Webhook handler
│   ├── mercadopago-create-payment.js ✅ Criar pagamentos
│   └── mercadopago-qr-code.js    ✅ Buscar QR codes
├── src/                          ✅ Frontend React
├── vercel.json                   ✅ Configuração Vercel
├── package.json                  ✅ Dependências
├── .vercelignore                 ✅ Arquivos ignorados
└── dist/                         ✅ Build gerado
```

## 🚀 Deploy no Vercel

### **Método 1: Via GitHub (Recomendado)**

#### **Passo 1: Conectar Repositório**
1. Acesse: https://vercel.com
2. Faça login com sua conta GitHub
3. Clique em **"New Project"**
4. Selecione: `julioosinski/relax-chair-manager`
5. Clique em **"Import"**

#### **Passo 2: Configurar Projeto**
- **Framework Preset**: Vite (detecção automática)
- **Root Directory**: `./`
- **Build Command**: `npm run build` (já configurado)
- **Output Directory**: `dist` (já configurado)

#### **Passo 3: Variáveis de Ambiente**
Adicione no painel do Vercel:
```
MERCADOPAGO_ACCESS_TOKEN = seu_token_mercadopago_aqui
```

#### **Passo 4: Deploy**
- Clique em **"Deploy"**
- Aguarde 2-3 minutos
- Receba a URL: `https://relax-chair-manager.vercel.app`

### **Método 2: Via CLI**

```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 🔍 Verificação Pós-Deploy

### **1. Testar Frontend**
- Acesse: `https://relax-chair-manager.vercel.app`
- Verifique se a página carrega
- Teste a navegação

### **2. Testar API**
```bash
# Testar webhook
curl https://relax-chair-manager.vercel.app/api/mercadopago-webhook

# Testar conexão
curl -X POST https://relax-chair-manager.vercel.app/api/mercadopago-test \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"TEST-123","publicKey":"TEST-456"}'
```

### **3. Verificar Logs**
1. Dashboard Vercel → Functions
2. Clique em qualquer função
3. Verifique logs sem erros

## 🎯 URLs Finais

### **Frontend**
```
https://relax-chair-manager.vercel.app
```

### **API Endpoints**
```
https://relax-chair-manager.vercel.app/api/mercadopago-test
https://relax-chair-manager.vercel.app/api/mercadopago-webhook
https://relax-chair-manager.vercel.app/api/mercadopago-create-payment
https://relax-chair-manager.vercel.app/api/mercadopago-qr-code
```

### **Webhook URL para Mercado Pago**
```
https://relax-chair-manager.vercel.app/api/mercadopago-webhook
```

## 🔧 Configuração do Mercado Pago

### **1. Dashboard Mercado Pago**
1. Acesse: https://www.mercadopago.com.br/developers
2. Vá em **Suas integrações**
3. Clique na sua aplicação

### **2. Configurar Webhook**
1. Vá em **Webhooks**
2. Clique em **Configurar webhooks**
3. Adicione a URL:
   ```
   https://relax-chair-manager.vercel.app/api/mercadopago-webhook
   ```
4. Selecione os eventos:
   - ✅ `payment`
   - ✅ `payment.updated`

### **3. Testar Webhook**
1. Clique em **Testar webhook**
2. Verifique se retorna status 200
3. Confirme que está funcionando

## 📊 Monitoramento

### **Dashboard Vercel**
- **Analytics**: Métricas de uso
- **Functions**: Logs das funções
- **Deployments**: Histórico de deploys

### **Logs em Tempo Real**
```bash
# Via CLI
vercel logs --follow

# Via Dashboard
https://vercel.com/dashboard
```

## 🆘 Troubleshooting

### **Erro: "Build Failed"**
- ✅ Build local testado com sucesso
- ✅ Dependências instaladas
- ✅ Scripts configurados

### **Erro: "Function Timeout"**
- ✅ Timeout configurado no `vercel.json`
- ✅ Funções otimizadas

### **Erro: "Environment Variables"**
- ✅ Variáveis configuradas no `vercel.json`
- ✅ Instruções de configuração fornecidas

### **Erro: "CORS"**
- ✅ Funções configuradas para CORS
- ✅ Headers corretos

## ✅ Status Final

### **Projeto Pronto Para Deploy**
- [x] Configurações completas
- [x] Build funcionando
- [x] Funções serverless prontas
- [x] Documentação completa
- [x] Repositório atualizado

### **Próximos Passos**
1. **Deploy no Vercel** (via GitHub ou CLI)
2. **Configurar variáveis de ambiente**
3. **Testar funcionalidades**
4. **Configurar webhook no Mercado Pago**
5. **Testar integração completa**

---

**🎉 Projeto 100% pronto para deploy no Vercel!**

**URL Final:**
```
https://relax-chair-manager.vercel.app
```
