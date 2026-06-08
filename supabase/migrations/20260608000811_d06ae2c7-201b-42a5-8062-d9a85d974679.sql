CREATE TABLE public.billing_edits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  docket_number text NOT NULL,
  date text,
  name text,
  place text,
  zone_id uuid,
  zone_name text,
  mode text,
  weight numeric,
  amount numeric,
  marked boolean NOT NULL DEFAULT false,
  notes text,
  edited_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (company_id, docket_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_edits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_edits TO authenticated;
GRANT ALL ON public.billing_edits TO service_role;

ALTER TABLE public.billing_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can manage billing_edits" ON public.billing_edits
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_billing_edits_updated_at
  BEFORE UPDATE ON public.billing_edits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();