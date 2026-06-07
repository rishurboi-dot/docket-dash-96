CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zones TO anon, authenticated;
GRANT ALL ON public.zones TO service_role;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage zones" ON public.zones FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.rate_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'Surface',
  weight_from numeric NOT NULL DEFAULT 0,
  weight_to numeric NOT NULL DEFAULT 999999,
  base_charge numeric NOT NULL DEFAULT 0,
  per_kg_charge numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_cards TO anon, authenticated;
GRANT ALL ON public.rate_cards TO service_role;
ALTER TABLE public.rate_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage rate_cards" ON public.rate_cards FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.dockets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_number text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dockets_number ON public.dockets (docket_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dockets TO anon, authenticated;
GRANT ALL ON public.dockets TO service_role;
ALTER TABLE public.dockets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage dockets" ON public.dockets FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.courier_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_reports TO anon, authenticated;
GRANT ALL ON public.courier_reports TO service_role;
ALTER TABLE public.courier_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage courier_reports" ON public.courier_reports FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.courier_report_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.courier_reports(id) ON DELETE CASCADE,
  docket_number text NOT NULL,
  weight numeric,
  zone_code text,
  mode text,
  destination text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_rows_number ON public.courier_report_rows (docket_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_report_rows TO anon, authenticated;
GRANT ALL ON public.courier_report_rows TO service_role;
ALTER TABLE public.courier_report_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage courier_report_rows" ON public.courier_report_rows FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.billing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  docket_number text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  zone_id uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  mode text,
  weight numeric,
  charge numeric NOT NULL DEFAULT 0,
  rate_card_id uuid REFERENCES public.rate_cards(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.courier_reports(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'billed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_number ON public.billing_records (docket_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_records TO anon, authenticated;
GRANT ALL ON public.billing_records TO service_role;
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can manage billing_records" ON public.billing_records FOR ALL USING (true) WITH CHECK (true);