ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS dedication_text text;

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS dedication_text text;

CREATE TABLE IF NOT EXISTS public.painting_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_ref text NOT NULL,
  instruction_code text NOT NULL UNIQUE,
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS painting_manifests_order_id_uidx ON public.painting_manifests(order_id);
CREATE INDEX IF NOT EXISTS painting_manifests_instruction_code_idx ON public.painting_manifests(instruction_code);

ALTER TABLE public.painting_manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read painting manifests" ON public.painting_manifests;
CREATE POLICY "Admins can read painting manifests"
  ON public.painting_manifests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_painting_manifests_updated_at ON public.painting_manifests;
CREATE TRIGGER update_painting_manifests_updated_at
  BEFORE UPDATE ON public.painting_manifests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
