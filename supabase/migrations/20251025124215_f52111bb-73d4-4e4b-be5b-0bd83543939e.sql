-- Criar tabela para controle de sessões ativas
CREATE TABLE IF NOT EXISTS poltrona_sessions (
  poltrona_id TEXT PRIMARY KEY,
  payment_id BIGINT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_end_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permitir leitura pública (para ESP32 e frontend verificarem)
ALTER TABLE poltrona_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sessions"
ON poltrona_sessions FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert sessions"
ON poltrona_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update sessions"
ON poltrona_sessions FOR UPDATE
USING (true);

-- Índice para consultas por poltrona ativa
CREATE INDEX IF NOT EXISTS idx_poltrona_sessions_active 
ON poltrona_sessions(poltrona_id, active) 
WHERE active = true;