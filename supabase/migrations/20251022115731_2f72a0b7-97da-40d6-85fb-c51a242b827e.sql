-- Fase 1: Permitir leitura pública de informações básicas das poltronas ativas
CREATE POLICY "Permitir leitura pública de poltronas ativas"
ON poltronas
FOR SELECT
TO anon
USING (active = true);

-- Comentário explicativo
COMMENT ON POLICY "Permitir leitura pública de poltronas ativas" ON poltronas IS
'Permite que usuários não autenticados vejam informações básicas de poltronas ativas para gerar pagamentos públicos';