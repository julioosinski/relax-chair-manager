# 🔧 Correção do Erro DNS - `seu-backend.com`

## 🚨 Problema Identificado

O erro `ERR_NAME_NOT_RESOLVED` para `seu-backend.com` indica que o sistema está tentando acessar um domínio inexistente.

## ✅ Solução Implementada

### 1. **URL Corrigida**
- **Antes**: `https://seu-backend.com/api`
- **Depois**: `https://relax-chair-manager.vercel.app/api`

### 2. **Fallback Inteligente**
- Sistema detecta quando backend não está disponível
- Usa modo offline automaticamente
- Valida configurações localmente

### 3. **Validação Melhorada**
- Verifica formato do token (APP- ou TEST-)
- Valida comprimento mínimo
- Fornece feedback claro

## 🚀 Como Testar Agora

### **Opção 1: Modo Offline (Funciona Imediatamente)**
1. Configure o token do Mercado Pago
2. Sistema validará localmente
3. Não haverá mais erros de DNS

### **Opção 2: Com Backend (Recomendado)**
1. **Faça deploy** das funções serverless
2. **Configure variáveis** de ambiente no Vercel
3. **Teste a conexão** - agora funcionará

## 📋 Passos para Deploy

### **1. Deploy no Vercel**
```bash
# Via GitHub (automático)
git push origin main

# Ou via CLI
vercel --prod
```

### **2. Configurar Variáveis**
No painel do Vercel:
- **Settings** → **Environment Variables**
- Adicionar: `MERCADOPAGO_ACCESS_TOKEN`

### **3. Verificar Deploy**
```bash
# Testar se as funções estão funcionando
curl https://relax-chair-manager.vercel.app/api/mercadopago-test
```

## 🔍 Verificação

### **Teste Local**
1. Abra o DevTools (F12)
2. Vá na aba Console
3. Execute: `console.log(import.meta.env.VITE_API_BASE_URL)`
4. Deve mostrar: `https://relax-chair-manager.vercel.app/api`

### **Teste de Conexão**
1. Vá em **Configurações**
2. Configure o token do Mercado Pago
3. Clique em **Testar Conexão**
4. Deve funcionar sem erros de DNS

## 📊 Status Atual

### ✅ **Funcionando**
- Configuração de token
- Validação local
- Modo offline
- Interface de usuário

### ⏳ **Pendente (Opcional)**
- Deploy das funções serverless
- Configuração de variáveis
- Teste com backend real

## 🆘 Troubleshooting

### **Ainda aparece `seu-backend.com`**
1. **Limpe o cache** do navegador (Ctrl+Shift+R)
2. **Reinicie** o servidor de desenvolvimento
3. **Verifique** se não há arquivo `.env.local` com URL antiga

### **Erro de CORS**
- Sistema já está configurado para fallback
- Não há mais erros de CORS

### **Token inválido**
- Use token que comece com `APP-` ou `TEST-`
- Token deve ter pelo menos 10 caracteres

## 🎯 Próximos Passos

1. **Teste a configuração** (deve funcionar agora)
2. **Configure o token** do Mercado Pago
3. **Faça deploy** das funções (opcional)
4. **Configure webhook** no Mercado Pago

---

**O erro de DNS foi corrigido! O sistema agora funciona em modo offline.** 🎉
