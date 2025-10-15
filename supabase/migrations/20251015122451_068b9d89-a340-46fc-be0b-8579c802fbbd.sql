-- ============================================
-- FASE 1: SISTEMA DE AUTORIZAÇÃO COM ROLES
-- ============================================

-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Criar tabela user_roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- 3. Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar função security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Criar função helper para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- ============================================
-- ATUALIZAR POLÍTICAS RLS - POLTRONAS
-- ============================================

-- Remover políticas antigas permissivas
DROP POLICY IF EXISTS "Authenticated users can delete poltronas" ON public.poltronas;
DROP POLICY IF EXISTS "Authenticated users can insert poltronas" ON public.poltronas;
DROP POLICY IF EXISTS "Authenticated users can update poltronas" ON public.poltronas;
DROP POLICY IF EXISTS "Authenticated users can view poltronas" ON public.poltronas;

-- SELECT: Todos podem ver poltronas (mas vamos criar view para esconder PIX keys)
CREATE POLICY "Authenticated users can view poltronas"
ON public.poltronas FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Apenas admins podem criar poltronas
CREATE POLICY "Only admins can insert poltronas"
ON public.poltronas FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- UPDATE: Apenas admins podem atualizar poltronas
CREATE POLICY "Only admins can update poltronas"
ON public.poltronas FOR UPDATE
USING (public.is_admin(auth.uid()));

-- DELETE: Apenas admins podem deletar poltronas
CREATE POLICY "Only admins can delete poltronas"
ON public.poltronas FOR DELETE
USING (public.is_admin(auth.uid()));

-- ============================================
-- ATUALIZAR POLÍTICAS RLS - PAYMENTS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;

-- SELECT: Apenas admins podem ver pagamentos
CREATE POLICY "Only admins can view payments"
ON public.payments FOR SELECT
USING (public.is_admin(auth.uid()));

-- INSERT: Apenas admins podem inserir pagamentos (webhook usará service role)
CREATE POLICY "Only admins can insert payments"
ON public.payments FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- ============================================
-- ATUALIZAR POLÍTICAS RLS - LOGS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.logs;
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.logs;

-- SELECT: Apenas admins podem ver logs
CREATE POLICY "Only admins can view logs"
ON public.logs FOR SELECT
USING (public.is_admin(auth.uid()));

-- INSERT: Sistema pode inserir logs (sem policy = service role only)
-- Não criamos policy de INSERT, apenas service role pode inserir

-- ============================================
-- POLÍTICAS PARA USER_ROLES
-- ============================================

-- Apenas admins podem ver roles
CREATE POLICY "Only admins can view user_roles"
ON public.user_roles FOR SELECT
USING (public.is_admin(auth.uid()));

-- Apenas admins podem atribuir roles
CREATE POLICY "Only admins can insert user_roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Apenas admins podem remover roles
CREATE POLICY "Only admins can delete user_roles"
ON public.user_roles FOR DELETE
USING (public.is_admin(auth.uid()));

-- ============================================
-- CRIAR VIEW SEGURA PARA POLTRONAS (SEM PIX KEY)
-- ============================================

CREATE OR REPLACE VIEW public.poltronas_public AS
SELECT 
  id,
  poltrona_id,
  ip,
  -- pix_key é omitido para usuários não-admin
  price,
  duration,
  location,
  active,
  created_at,
  updated_at
FROM public.poltronas;

-- RLS na view
ALTER VIEW public.poltronas_public SET (security_invoker = true);

-- ============================================
-- TRIGGER PARA AUTO-ATRIBUIR PRIMEIRO USUÁRIO COMO ADMIN
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_assign_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se é o primeiro usuário, torná-lo admin automaticamente
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_first_admin();

-- ============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.user_roles IS 'Tabela de roles de usuários. Apenas admins podem gerenciar.';
COMMENT ON FUNCTION public.has_role IS 'Função security definer para verificar se usuário tem role específico. Evita recursão em RLS.';
COMMENT ON FUNCTION public.is_admin IS 'Helper function para verificar se usuário é admin.';
COMMENT ON VIEW public.poltronas_public IS 'View pública de poltronas sem chaves PIX sensíveis.';