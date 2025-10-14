-- =============================================================================
-- CONFIGURAÇÃO DO SUPABASE PARA SISTEMA DE POLTRONAS DE MASSAGEM
-- =============================================================================

-- Este arquivo contém todas as configurações necessárias no Supabase
-- para o funcionamento do sistema de poltronas de massagem

-- =============================================================================
-- 1. CRIAÇÃO DAS TABELAS
-- =============================================================================

-- Tabela de poltronas
CREATE TABLE IF NOT EXISTS public.poltronas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poltrona_id TEXT NOT NULL UNIQUE,
  ip TEXT NOT NULL,
  pix_key TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  duration INTEGER NOT NULL DEFAULT 900,
  location TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  qr_code_data TEXT,  -- QR Code PIX do Mercado Pago
  payment_id TEXT,    -- ID do pagamento atual
  mercadopago_token TEXT, -- Token do Mercado Pago
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id BIGINT NOT NULL UNIQUE,
  poltrona_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_poltrona FOREIGN KEY (poltrona_id) REFERENCES public.poltronas(poltrona_id) ON DELETE CASCADE
);

-- Tabela de logs
CREATE TABLE IF NOT EXISTS public.logs (
  id BIGSERIAL PRIMARY KEY,
  poltrona_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT fk_poltrona_log FOREIGN KEY (poltrona_id) REFERENCES public.poltronas(poltrona_id) ON DELETE CASCADE
);

-- =============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índices para tabela payments
CREATE INDEX IF NOT EXISTS idx_payments_poltrona_id ON public.payments(poltrona_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON public.payments(approved_at DESC);

-- Índices para tabela logs
CREATE INDEX IF NOT EXISTS idx_logs_poltrona_id ON public.logs(poltrona_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);

-- Índices para tabela poltronas
CREATE INDEX IF NOT EXISTS idx_poltronas_poltrona_id ON public.poltronas(poltrona_id);
CREATE INDEX IF NOT EXISTS idx_poltronas_active ON public.poltronas(active);

-- =============================================================================
-- 3. FUNÇÕES AUXILIARES
-- =============================================================================

-- Função para atualizar timestamp de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar payment_id único
CREATE OR REPLACE FUNCTION public.generate_payment_id()
RETURNS BIGINT AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM NOW())::BIGINT * 1000 + EXTRACT(MICROSECONDS FROM NOW())::BIGINT % 1000;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se poltrona está ativa
CREATE OR REPLACE FUNCTION public.is_poltrona_active(p_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.poltronas 
    WHERE poltrona_id = p_id AND active = true
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

-- Trigger para atualizar updated_at na tabela poltronas
DROP TRIGGER IF EXISTS set_updated_at ON public.poltronas;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.poltronas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS
ALTER TABLE public.poltronas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Políticas para poltronas
DROP POLICY IF EXISTS "Authenticated users can view poltronas" ON public.poltronas;
CREATE POLICY "Authenticated users can view poltronas"
  ON public.poltronas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert poltronas" ON public.poltronas;
CREATE POLICY "Authenticated users can insert poltronas"
  ON public.poltronas FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update poltronas" ON public.poltronas;
CREATE POLICY "Authenticated users can update poltronas"
  ON public.poltronas FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete poltronas" ON public.poltronas;
CREATE POLICY "Authenticated users can delete poltronas"
  ON public.poltronas FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para payments
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
CREATE POLICY "Authenticated users can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas para logs
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.logs;
CREATE POLICY "Authenticated users can view logs"
  ON public.logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert logs" ON public.logs;
CREATE POLICY "Authenticated users can insert logs"
  ON public.logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================================================
-- 6. DADOS DE EXEMPLO
-- =============================================================================

-- Inserir poltrona de exemplo
INSERT INTO public.poltronas (
  poltrona_id, 
  ip, 
  pix_key, 
  price, 
  duration, 
  location, 
  active
) VALUES (
  'p1',
  '192.168.1.100',
  'chavepix@exemplo.com',
  10.00,
  900,
  'Shopping A - Piso 2',
  true
) ON CONFLICT (poltrona_id) DO NOTHING;

-- Inserir pagamento de exemplo
INSERT INTO public.payments (
  payment_id,
  poltrona_id,
  amount,
  status,
  approved_at
) VALUES (
  public.generate_payment_id(),
  'p1',
  10.00,
  'approved',
  NOW()
) ON CONFLICT (payment_id) DO NOTHING;

-- =============================================================================
-- 7. VIEWS ÚTEIS
-- =============================================================================

-- View para estatísticas de pagamentos
CREATE OR REPLACE VIEW public.payment_stats AS
SELECT 
  poltrona_id,
  COUNT(*) as total_payments,
  SUM(amount) as total_revenue,
  AVG(amount) as avg_amount,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_payments,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_payments,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_payments
FROM public.payments
GROUP BY poltrona_id;

-- View para logs recentes
CREATE OR REPLACE VIEW public.recent_logs AS
SELECT 
  l.*,
  p.location
FROM public.logs l
JOIN public.poltronas p ON l.poltrona_id = p.poltrona_id
ORDER BY l.created_at DESC
LIMIT 100;

-- =============================================================================
-- 8. FUNÇÕES DE API
-- =============================================================================

-- Função para criar pagamento
CREATE OR REPLACE FUNCTION public.create_payment(
  p_poltrona_id TEXT,
  p_amount DECIMAL(10,2)
)
RETURNS JSON AS $$
DECLARE
  new_payment_id BIGINT;
  result JSON;
BEGIN
  -- Verificar se poltrona existe e está ativa
  IF NOT public.is_poltrona_active(p_poltrona_id) THEN
    RETURN json_build_object('error', 'Poltrona não encontrada ou inativa');
  END IF;
  
  -- Gerar novo payment_id
  new_payment_id := public.generate_payment_id();
  
  -- Inserir pagamento
  INSERT INTO public.payments (payment_id, poltrona_id, amount, status)
  VALUES (new_payment_id, p_poltrona_id, p_amount, 'pending');
  
  -- Retornar resultado
  SELECT json_build_object(
    'payment_id', new_payment_id,
    'poltrona_id', p_poltrona_id,
    'amount', p_amount,
    'status', 'pending',
    'created_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para aprovar pagamento
CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id BIGINT
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Atualizar pagamento
  UPDATE public.payments 
  SET status = 'approved', approved_at = NOW()
  WHERE payment_id = p_payment_id;
  
  -- Verificar se foi atualizado
  IF FOUND THEN
    SELECT json_build_object(
      'success', true,
      'message', 'Pagamento aprovado com sucesso'
    ) INTO result;
  ELSE
    SELECT json_build_object(
      'success', false,
      'message', 'Pagamento não encontrado'
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 9. CONFIGURAÇÕES DE SEGURANÇA
-- =============================================================================

-- Configurar CORS para permitir requisições do ESP32
-- (Isso deve ser feito nas configurações do Supabase Dashboard)

-- =============================================================================
-- 10. MONITORAMENTO
-- =============================================================================

-- Query para monitorar status das poltronas
CREATE OR REPLACE VIEW public.poltrona_status AS
SELECT 
  p.poltrona_id,
  p.location,
  p.active,
  p.price,
  p.duration,
  COALESCE(ps.total_payments, 0) as total_payments,
  COALESCE(ps.total_revenue, 0) as total_revenue,
  COALESCE(ps.approved_payments, 0) as approved_payments,
  p.updated_at
FROM public.poltronas p
LEFT JOIN public.payment_stats ps ON p.poltrona_id = ps.poltrona_id
ORDER BY p.poltrona_id;

-- =============================================================================
-- INSTRUÇÕES DE USO
-- =============================================================================

/*
1. Execute este script no SQL Editor do Supabase
2. Configure as variáveis de ambiente no ESP32:
   - SUPABASE_URL: URL do seu projeto
   - SUPABASE_ANON_KEY: Chave anônima do projeto
3. Teste a conexão usando as funções de API
4. Monitore os logs e pagamentos através das views criadas

Exemplo de uso das funções:
- SELECT public.create_payment('p1', 10.00);
- SELECT public.approve_payment(1234567890);
- SELECT * FROM public.poltrona_status;
*/
