# 🔧 Configuração de Variáveis de Ambiente

## 📋 Variáveis Necessárias

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```bash
# Configuração do Backend API
VITE_API_BASE_URL=https://relax-chair-manager.vercel.app/api

# Configuração do Supabase
VITE_SUPABASE_URL=sua_url_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_supabase_aqui

# Configuração do Mercado Pago (opcional)
VITE_MERCADOPAGO_PUBLIC_KEY=sua_chave_publica_mercadopago_aqui

# Configuração do Sistema
VITE_APP_NAME=Relax Chair Manager
VITE_APP_VERSION=1.0.0
```

## 🚀 Como Configurar

### 1. **Criar arquivo `.env.local`**
```bash
# Na raiz do projeto
touch .env.local
```

### 2. **Adicionar as variáveis**
```bash
# Copie e cole o conteúdo acima no arquivo .env.local
# Substitua os valores pelos seus dados reais
```

### 3. **Reiniciar o servidor de desenvolvimento**
```bash
npm run dev
```

## 🔍 Verificação

Para verificar se as variáveis estão sendo carregadas:

1. Abra o DevTools (F12)
2. Vá na aba Console
3. Digite: `console.log(import.meta.env)`
4. Verifique se as variáveis aparecem

## ⚠️ Importante

- **Nunca commite** o arquivo `.env.local` no Git
- **Use sempre** `.env.local` para configurações locais
- **O arquivo** `.env.example` serve apenas como modelo

## 🔧 URLs Padrão

Se não configurar as variáveis, o sistema usará:

- **API Base URL**: `https://relax-chair-manager.vercel.app/api`
- **Supabase**: Configurado via interface
- **Mercado Pago**: Configurado via interface
