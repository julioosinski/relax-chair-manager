-- Adicionar colunas para QR Code fixo na tabela poltronas
ALTER TABLE public.poltronas 
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMP WITH TIME ZONE;

-- Adicionar índice para buscar por payment_id
CREATE INDEX IF NOT EXISTS idx_poltronas_payment_id ON public.poltronas(payment_id);

-- Adicionar coluna para rastrear se pagamento foi processado
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_attempts INTEGER DEFAULT 0;

-- Adicionar índice para buscar pagamentos não processados
CREATE INDEX IF NOT EXISTS idx_payments_processed ON public.payments(processed, status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(payment_id);