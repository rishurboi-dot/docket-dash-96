DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'companies','dockets','courier_reports','courier_report_rows',
    'billing_records','rate_cards','cities','quotations','zones',
    'quotation_rates','billing_edits'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public can manage %s" ON public.%I;', t, t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format(
      'CREATE POLICY "Authenticated can manage %s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t, t
    );
  END LOOP;
END $$;