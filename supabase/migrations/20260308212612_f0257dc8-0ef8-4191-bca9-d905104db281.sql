
CREATE TABLE public.site_assets (
  key TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site assets"
  ON public.site_assets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage site assets"
  ON public.site_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
