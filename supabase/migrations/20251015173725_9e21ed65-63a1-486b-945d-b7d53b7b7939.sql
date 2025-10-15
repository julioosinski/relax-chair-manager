-- Adicionar campos de monitoramento ao poltrona_status
ALTER TABLE public.poltrona_status
ADD COLUMN IF NOT EXISTS wifi_signal INTEGER,
ADD COLUMN IF NOT EXISTS uptime_seconds INTEGER;