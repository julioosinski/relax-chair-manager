-- Criar tabela de auditoria para rastrear todas as ações administrativas
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- RLS para audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Criar tabela de profiles para dados adicionais dos usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Criar tabela de manutenção de poltronas
CREATE TABLE public.poltrona_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poltrona_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  performed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_poltrona FOREIGN KEY (poltrona_id) REFERENCES public.poltronas(poltrona_id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_maintenance_poltrona ON public.poltrona_maintenance(poltrona_id);
CREATE INDEX idx_maintenance_status ON public.poltrona_maintenance(status);
CREATE INDEX idx_maintenance_scheduled ON public.poltrona_maintenance(scheduled_at);

-- RLS para maintenance
ALTER TABLE public.poltrona_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage maintenance"
ON public.poltrona_maintenance
FOR ALL
USING (is_admin(auth.uid()));

CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON public.poltrona_maintenance
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Criar tabela de status de poltronas (online/offline)
CREATE TABLE public.poltrona_status (
  poltrona_id TEXT PRIMARY KEY,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_ping TIMESTAMP WITH TIME ZONE,
  firmware_version TEXT,
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_poltrona_status FOREIGN KEY (poltrona_id) REFERENCES public.poltronas(poltrona_id) ON DELETE CASCADE
);

-- RLS para poltrona_status
ALTER TABLE public.poltrona_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view poltrona status"
ON public.poltrona_status
FOR SELECT
USING (true);

CREATE POLICY "System can update poltrona status"
ON public.poltrona_status
FOR ALL
USING (true);

-- Habilitar realtime para payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;

-- Habilitar realtime para poltrona_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.poltrona_status;

-- Criar view para estatísticas agregadas
CREATE OR REPLACE VIEW public.payment_stats AS
SELECT 
  DATE(approved_at) as date,
  poltrona_id,
  COUNT(*) as total_payments,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM public.payments
WHERE status = 'approved' AND approved_at IS NOT NULL
GROUP BY DATE(approved_at), poltrona_id;

-- RLS para view
ALTER VIEW public.payment_stats SET (security_invoker = true);