# 🔧 Guia Completo - Configuração das Variáveis no Supabase

## 📋 Passo a Passo Detalhado

### **1. Acessar o Supabase Dashboard**

1. **Abra seu navegador**
2. **Acesse**: https://supabase.com/dashboard
3. **Faça login** na sua conta
4. **Clique no seu projeto**: `pplaglcevtvlpzdnmvqd`

### **2. Navegar para Edge Functions**

1. **No menu lateral esquerdo**, procure por **"Settings"** (Configurações)
2. **Clique em "Settings"**
3. **Na página de configurações**, procure por **"Edge Functions"**
4. **Clique em "Edge Functions"**

### **3. Configurar Variáveis de Ambiente**

1. **Na página de Edge Functions**, procure por **"Environment Variables"** ou **"Variáveis de Ambiente"**
2. **Clique em "Environment Variables"**
3. **Você verá uma tabela** com variáveis existentes (pode estar vazia)
4. **Clique no botão "Add new variable"** ou **"Adicionar nova variável"**

### **4. Adicionar a Variável do Mercado Pago**

**Preencha os campos exatamente assim:**

- **Name** (Nome): `MERCADOPAGO_ACCESS_TOKEN`
- **Value** (Valor): `APP_USR-2532798663353163-101409-41722b1525e26a2a3f1dadcb02086db1-13158573`

### **5. Salvar e Verificar**

1. **Clique em "Save"** ou **"Salvar"**
2. **Verifique se a variável aparece na tabela**:
   ```
   MERCADOPAGO_ACCESS_TOKEN | APP_USR-2532798663353163-101409-41722b1525e26a2a3f1dadcb02086db1-13158573
   ```

## 🖼️ Capturas de Tela (Referência)

### **Tela 1: Dashboard do Supabase**
```
┌─────────────────────────────────────────┐
│ [Logo] Supabase                         │
├─────────────────────────────────────────┤
│ Projects                                 │
│ ├─ pplaglcevtvlpzdnmvqd                 │
│ └─ ...                                  │
├─────────────────────────────────────────┤
│ Settings ← CLIQUE AQUI                  │
│ Edge Functions                          │
│ Database                                │
│ Authentication                          │
│ Storage                                 │
│ API                                     │
│ Logs                                    │
└─────────────────────────────────────────┘
```

### **Tela 2: Configurações**
```
┌─────────────────────────────────────────┐
│ Settings                                 │
├─────────────────────────────────────────┤
│ General                                 │
│ API                                     │
│ Database                                │
│ Authentication                          │
│ Storage                                 │
│ Edge Functions ← CLIQUE AQUI            │
│ Logs                                    │
│ Billing                                 │
│ Team                                    │
└─────────────────────────────────────────┘
```

### **Tela 3: Edge Functions**
```
┌─────────────────────────────────────────┐
│ Edge Functions                           │
├─────────────────────────────────────────┤
│ Functions                                │
│ Environment Variables ← CLIQUE AQUI     │
│ Logs                                     │
│ Settings                                 │
└─────────────────────────────────────────┘
```

### **Tela 4: Variáveis de Ambiente**
```
┌─────────────────────────────────────────┐
│ Environment Variables                    │
├─────────────────────────────────────────┤
│ Name                    │ Value         │
├─────────────────────────────────────────┤
│                         │               │
│ [Empty table]           │               │
│                         │               │
├─────────────────────────────────────────┤
│ [+ Add new variable] ← CLIQUE AQUI      │
└─────────────────────────────────────────┘
```

### **Tela 5: Adicionar Variável**
```
┌─────────────────────────────────────────┐
│ Add Environment Variable                 │
├─────────────────────────────────────────┤
│ Name:                                   │
│ [MERCADOPAGO_ACCESS_TOKEN]              │
│                                         │
│ Value:                                  │
│ [APP_USR-2532798663353163-101409-41722b1525e26a2a3f1dadcb02086db1-13158573] │
│                                         │
│ [Cancel]              [Save] ← CLIQUE   │
└─────────────────────────────────────────┘
```

## ✅ Verificação Final

**Depois de salvar, você deve ver:**

```
┌─────────────────────────────────────────┐
│ Environment Variables                    │
├─────────────────────────────────────────┤
│ Name                    │ Value         │
├─────────────────────────────────────────┤
│ MERCADOPAGO_ACCESS_TOKEN │ APP_USR-253...│
└─────────────────────────────────────────┘
```

## 🚨 Problemas Comuns

### **Problema 1: Não encontro "Edge Functions"**
- **Solução**: Procure por "Functions" ou "Funções" no menu Settings

### **Problema 2: Não encontro "Environment Variables"**
- **Solução**: Pode estar em "Variables" ou "Variáveis"

### **Problema 3: Botão "Save" não funciona**
- **Solução**: Verifique se copiou o valor completo do token

### **Problema 4: Variável não aparece na lista**
- **Solução**: Recarregue a página (F5)

## 📞 Suporte

**Se tiver dificuldades:**
1. Tire uma captura de tela da tela atual
2. Verifique se está logado na conta correta
3. Confirme se está no projeto correto: `pplaglcevtvlpzdnmvqd`

---

**URLs importantes:**
- Dashboard: https://supabase.com/dashboard
- Seu projeto: https://supabase.com/dashboard/project/pplaglcevtvlpzdnmvqd
