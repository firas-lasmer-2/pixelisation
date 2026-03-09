DROP POLICY IF EXISTS "Admins can insert order assets" ON public.order_assets;
CREATE POLICY "Admins can insert order assets"
  ON public.order_assets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update ai generation runs" ON public.ai_generation_runs;
CREATE POLICY "Admins can update ai generation runs"
  ON public.ai_generation_runs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
