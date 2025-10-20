-- Atualizar chave PIX para a nova conta
UPDATE public.poltronas
SET pix_key = 'juliocesarosinski@gmail.com'
WHERE poltrona_id = 'poltrona_1';

-- Limpar QR codes antigos para forçar regeneração
UPDATE public.poltronas
SET 
  qr_code = NULL,
  payment_id = NULL,
  qr_code_generated_at = NULL
WHERE poltrona_id = 'poltrona_1';

-- Registrar a atualização nos logs
INSERT INTO public.logs (poltrona_id, message)
VALUES ('poltrona_1', '🔄 Chave PIX atualizada para juliocesarosinski@gmail.com - QR Code será regenerado');