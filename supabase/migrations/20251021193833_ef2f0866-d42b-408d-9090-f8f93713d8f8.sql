-- Adicionar coluna para URL pública de pagamento
ALTER TABLE poltronas 
ADD COLUMN IF NOT EXISTS public_payment_url TEXT;

-- Adicionar comentário para documentação
COMMENT ON COLUMN poltronas.public_payment_url IS 
'URL pública para QR Code impresso (ex: https://seusite.com/pay/poltrona_1)';

-- Limpar payment_id e qr_code antigos para recomeçar limpo
UPDATE poltronas 
SET payment_id = NULL, 
    qr_code = NULL,
    qr_code_generated_at = NULL
WHERE payment_id IS NOT NULL;