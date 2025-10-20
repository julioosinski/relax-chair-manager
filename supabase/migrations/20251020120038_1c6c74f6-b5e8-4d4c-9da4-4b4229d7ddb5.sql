-- FASE 1: Adicionar Campos de Controle de Sessão à tabela poltronas

-- Adicionar colunas para controle de sessão
ALTER TABLE public.poltronas 
ADD COLUMN IF NOT EXISTS session_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS session_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_payment_id TEXT;

-- Criar índice para busca rápida de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_session_active ON public.poltronas(session_active, session_ends_at);

-- Comentários para documentação
COMMENT ON COLUMN public.poltronas.session_active IS 'Indica se há uma sessão ativa (poltrona em uso)';
COMMENT ON COLUMN public.poltronas.session_started_at IS 'Timestamp de quando a sessão foi iniciada';
COMMENT ON COLUMN public.poltronas.session_ends_at IS 'Timestamp de quando a sessão deve terminar';
COMMENT ON COLUMN public.poltronas.current_payment_id IS 'ID do pagamento da sessão atual';