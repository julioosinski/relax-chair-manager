# 🆘 Troubleshooting - Problemas de Deploy no Vercel

## 🚨 Problemas Identificados

### **Erro 1: 404 - Projeto não encontrado**
```
/api/v2/projects/relax-chair-manager-8cw1?deploymentInfo=0&teamId=team_io43Nh1nABxcc7chE1F9X4Nh:1
Failed to load resource: the server responded with a status of 404 ()
```

### **Erro 2: 400 - Deploy falhou**
```
/api/v13/deployments?skipAutoDetectionConfirmation=1&teamId=team_io43Nh1nABxcc7chE1F9X4Nh:1
Failed to load resource: the server responded with a status of 400 ()
```

### **Erro 3: CSP - Content Security Policy**
```
Refused to load the stylesheet 'https://www.gstatic.com/_/translate_http/_/ss/...'
```

## ✅ Soluções Implementadas

### **1. Configuração Simplificada**
- ✅ Removido `builds` complexo do `vercel.json`
- ✅ Usado `rewrites` em vez de `routes`
- ✅ Simplificado configuração de funções

### **2. Headers de Segurança**
- ✅ Criado `public/_headers` para resolver CSP
- ✅ Configurado CORS para API
- ✅ Headers de segurança adicionados

### **3. Configuração Otimizada**
- ✅ Vercel detectará automaticamente Vite
- ✅ Build automático configurado
- ✅ Funções serverless prontas

## 🚀 Passos para Resolver

### **Passo 1: Limpar Projeto Anterior**
1. **Acesse o dashboard do Vercel**
2. **Delete o projeto anterior** (se existir)
3. **Limpe o cache** do navegador

### **Passo 2: Criar Novo Projeto**
1. **Acesse**: https://vercel.com
2. **Clique em "New Project"**
3. **Selecione**: `julioosinski/relax-chair-manager`
4. **Clique em "Import"**

### **Passo 3: Configurar Projeto**
- **Framework Preset**: Deixe em branco (auto-detecção)
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### **Passo 4: Variáveis de Ambiente**
```
MERCADOPAGO_ACCESS_TOKEN = seu_token_aqui
```

### **Passo 5: Deploy**
- **Clique em "Deploy"**
- **Aguarde** o processo completo
- **Verifique** se não há erros

## 🔧 Configuração Manual (Se Necessário)

### **Via CLI**
```bash
# Instalar CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### **Configuração Manual**
Se o deploy automático falhar:

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/julioosinski/relax-chair-manager.git
   cd relax-chair-manager
   ```

2. **Instale dependências**:
   ```bash
   npm install
   ```

3. **Teste build local**:
   ```bash
   npm run build
   ```

4. **Deploy via CLI**:
   ```bash
   vercel --prod
   ```

## 🔍 Verificação Pós-Deploy

### **1. Testar Frontend**
```bash
# Acesse a URL fornecida pelo Vercel
https://relax-chair-manager-[hash].vercel.app
```

### **2. Testar API**
```bash
# Testar webhook
curl https://relax-chair-manager-[hash].vercel.app/api/mercadopago-webhook

# Testar conexão
curl -X POST https://relax-chair-manager-[hash].vercel.app/api/mercadopago-test \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"TEST-123","publicKey":"TEST-456"}'
```

### **3. Verificar Logs**
1. **Dashboard Vercel** → **Functions**
2. **Clique em qualquer função**
3. **Verifique logs** sem erros

## 🆘 Soluções Alternativas

### **Se o Deploy Ainda Falhar**

#### **Opção 1: Netlify**
1. **Acesse**: https://netlify.com
2. **Conecte** o repositório GitHub
3. **Configure**:
   - Build command: `npm run build`
   - Publish directory: `dist`

#### **Opção 2: Render**
1. **Acesse**: https://render.com
2. **Conecte** o repositório GitHub
3. **Configure** como Static Site

#### **Opção 3: GitHub Pages**
1. **Ative** GitHub Pages no repositório
2. **Configure** para usar GitHub Actions
3. **Deploy** automático a cada push

### **Configuração para Netlify**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

## 📊 Status Atual

### **✅ Configurações Corrigidas**
- [x] `vercel.json` simplificado
- [x] Headers de segurança configurados
- [x] CORS configurado
- [x] Funções serverless prontas

### **⏳ Próximos Passos**
1. **Limpar projeto anterior** no Vercel
2. **Criar novo projeto** do zero
3. **Configurar** manualmente se necessário
4. **Testar** funcionalidades

## 🎯 URLs Esperadas

### **Após Deploy Bem-sucedido**
```
Frontend: https://relax-chair-manager-[hash].vercel.app
API: https://relax-chair-manager-[hash].vercel.app/api/
Webhook: https://relax-chair-manager-[hash].vercel.app/api/mercadopago-webhook
```

---

**🔧 As configurações foram corrigidas. Tente criar um novo projeto no Vercel do zero.**
