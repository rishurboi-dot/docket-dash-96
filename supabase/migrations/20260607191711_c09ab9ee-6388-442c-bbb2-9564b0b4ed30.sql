-- Cities master (city -> zone mapping for automatic zone detection)
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cities_name_unique ON public.cities (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage cities" ON public.cities FOR ALL TO public USING (true) WITH CHECK (true);

-- Quotations: one rate sheet per company per mode
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'Surface',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, mode)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO anon, authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage quotations" ON public.quotations FOR ALL TO public USING (true) WITH CHECK (true);

-- Quotation rate slabs
CREATE TABLE public.quotation_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  min_weight_g integer NOT NULL DEFAULT 0,
  max_weight_g integer,
  rate numeric NOT NULL DEFAULT 0,
  rate_unit text NOT NULL DEFAULT 'flat',
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quotation_rates_quotation_zone_idx ON public.quotation_rates (quotation_id, zone_id, min_weight_g);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_rates TO anon, authenticated;
GRANT ALL ON public.quotation_rates TO service_role;
ALTER TABLE public.quotation_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage quotation_rates" ON public.quotation_rates FOR ALL TO public USING (true) WITH CHECK (true);