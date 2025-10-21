-- Configurar cron job para limpeza automática de sessões expiradas
-- Executará a cada 1 minuto

-- Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar o cron job para chamar a Edge Function de limpeza
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '*/1 * * * *', -- A cada 1 minuto
  $$
  SELECT
    net.http_post(
      url:='https://pplaglcevtvlpzdnmvqd.supabase.co/functions/v1/cleanup-expired-sessions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGFnbGNldnR2bHB6ZG5tdnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzOTYxOTgsImV4cCI6MjA3NTk3MjE5OH0.XE9rN4KAWT7Ng_Y-otAFZlP3j4bdRAt5qYh-SIwuFCw"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);