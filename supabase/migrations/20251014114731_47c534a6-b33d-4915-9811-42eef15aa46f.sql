-- Fix security warning: Set search_path for function
-- Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS set_updated_at ON public.poltronas;
DROP FUNCTION IF EXISTS public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.poltronas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();