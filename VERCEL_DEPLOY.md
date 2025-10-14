# 🚀 Deploy no Vercel - Guia Completo

## 📋 Pré-requisitos

1. ✅ Conta no Vercel (gratuita)
2. ✅ Projeto no GitHub
3. ✅ Repositório atualizado

## 🔧 Configuração Atual

### **Arquivos Configurados:**
- ✅ `vercel.json` - Configuração do Vercel
- ✅ `package.json` - Dependências do projeto
- ✅ `api/` - Funções serverless
- ✅ `.vercelignore` - Arquivos ignorados

### **Estrutura do Projeto:**
```
relax-chair-manager/
├── api/                          # Funções serverless
│   ├── mercadopago-test.js
│   ├── mercadopago-webhook.js
│   ├── mercadopago-create-payment.js
│   └── mercadopago-qr-code.js
├── src/                          # Frontend React
├── vercel.json                   # Configuração Vercel
├── package.json                  # Dependências
└── .vercelignore                 # Arquivos ignorados
```

## 🚀 Métodos de Deploy

### **Método 1: Via GitHub (Recomendado)**

#### **1. Conectar Repositório**
1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em **"New Project"**
4. Selecione o repositório: `julioosinski/relax-chair-manager`
5. Clique em **"Import"**

#### **2. Configurar Projeto**
- **Framework Preset**: Vite
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### **3. Variáveis de Ambiente**
Adicione as seguintes variáveis:
```
MERCADOPAGO_ACCESS_TOKEN = seu_token_aqui
```

#### **4. Deploy**
- Clique em **"Deploy"**
- Aguarde o processo (2-3 minutos)

### **Método 2: Via CLI**

#### **1. Instalar Vercel CLI**
```bash
npm i -g vercel
```

#### **2. Login**
```bash
vercel login
```

#### **3. Deploy**
```bash
vercel --prod
```

## 🔍 Verificação do Deploy

### **1. URLs Geradas**
Após o deploy, você receberá:
- **Frontend**: `https://relax-chair-manager.vercel.app`
- **API**: `https://relax-chair-manager.vercel.app/api/`

### **2. Testar Funções**
```bash
# Testar webhook
curl https://relax-chair-manager.vercel.app/api/mercadopago-webhook

# Testar conexão
curl -X POST https://relax-chair-manager.vercel.app/api/mercadopago-test \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"TEST-123"}'
```

### **3. Verificar Logs**
1. Acesse o dashboard do Vercel
2. Vá em **Functions**
3. Clique em qualquer função
4. Verifique os logs

## 🆘 Troubleshooting

### **Erro: "Build Failed"**

#### **Causa 1: Dependências**
```bash
# Verificar se todas as dependências estão instaladas
npm install
```

#### **Causa 2: Scripts**
```bash
# Testar build localmente
npm run build
```

#### **Causa 3: TypeScript**
```bash
# Verificar erros de TypeScript
npx tsc --noEmit
```

### **Erro: "Function Timeout"**

#### **Solução:**
- Aumentar timeout no `vercel.json`
- Otimizar código das funções

### **Erro: "Environment Variables"**

#### **Solução:**
1. Vá em **Settings** → **Environment Variables**
2. Adicione `MERCADOPAGO_ACCESS_TOKEN`
3. Faça redeploy

### **Erro: "CORS"**

#### **Solução:**
- Funções já estão configuradas para CORS
- Verificar se headers estão corretos

## 📊 Monitoramento

### **Dashboard do Vercel**
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

## 🔄 Deploy Automático

### **Configuração**
1. **GitHub Integration**: Ativada por padrão
2. **Auto Deploy**: A cada push na branch `main`
3. **Preview Deploys**: Para branches de desenvolvimento

### **Workflow**
```
Push para main → Vercel detecta → Build automático → Deploy
```

## ✅ Checklist de Deploy

- [ ] Repositório conectado ao Vercel
- [ ] Build local funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Funções serverless testadas
- [ ] URLs acessíveis
- [ ] Logs sem erros

## 🎯 Próximos Passos

1. **Deploy no Vercel**
2. **Configurar variáveis de ambiente**
3. **Testar funções serverless**
4. **Configurar webhook no Mercado Pago**
5. **Testar integração completa**

---

**URL Final do Projeto:**
```
https://relax-chair-manager.vercel.app
```
