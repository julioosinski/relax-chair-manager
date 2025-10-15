-- Permitir leitura pública de poltronas ativas para o portal de configuração do ESP32
CREATE POLICY "Public can view active poltronas for ESP32 config"
ON public.poltronas
FOR SELECT
TO anon
USING (active = true);