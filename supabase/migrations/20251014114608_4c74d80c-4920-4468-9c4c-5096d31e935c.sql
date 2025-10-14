-- Create poltronas table
CREATE TABLE public.poltronas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poltrona_id TEXT NOT NULL UNIQUE,
  ip TEXT NOT NULL,
  pix_key TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  duration INTEGER NOT NULL DEFAULT 900,
  location TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id BIGINT NOT NULL UNIQUE,
  poltrona_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_poltrona FOREIGN KEY (poltrona_id) REFERENCES public.poltronas(poltrona_id) ON DELETE CASCADE
);

-- Create logs table
CREATE TABLE public.logs (
  id BIGSERIAL PRIMARY KEY,
  poltrona_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT fk_poltrona_log FOREIGN KEY (poltrona_id) REFERENCES public.poltronas(poltrona_id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.poltronas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for poltronas (authenticated users can manage)
CREATE POLICY "Authenticated users can view poltronas"
  ON public.poltronas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert poltronas"
  ON public.poltronas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update poltronas"
  ON public.poltronas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete poltronas"
  ON public.poltronas FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for payments (authenticated users can view)
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for logs (authenticated users can view)
CREATE POLICY "Authenticated users can view logs"
  ON public.logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert logs"
  ON public.logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_payments_poltrona_id ON public.payments(poltrona_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_logs_poltrona_id ON public.logs(poltrona_id);
CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for poltronas updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.poltronas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();