-- Fase 3: Corrigir sistema de heartbeat do ESP32

-- Permitir INSERT na tabela poltrona_status
CREATE POLICY "System can insert poltrona status"
ON poltrona_status
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Adicionar primary key se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'poltrona_status_pkey'
  ) THEN
    ALTER TABLE poltrona_status
    ADD PRIMARY KEY (poltrona_id);
  END IF;
END $$;