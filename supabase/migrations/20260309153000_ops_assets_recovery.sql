ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS fulfillment_note text DEFAULT '',
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS dream_job text,
  ADD COLUMN IF NOT EXISTS last_recovery_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_channel text,
  ADD COLUMN IF NOT EXISTS last_recovery_status text,
  ADD COLUMN IF NOT EXISTS recovered_order_ref text;

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  tracking_number text,
  courier_name text,
  note text,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read order status events" ON public.order_status_events;
CREATE POLICY "Admins can read order status events"
  ON public.order_status_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ai_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  session_id text,
  category text NOT NULL,
  dream_job text,
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  requested_by text NOT NULL DEFAULT 'studio',
  source_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_image_url text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_generation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read ai generation runs" ON public.ai_generation_runs;
CREATE POLICY "Admins can read ai generation runs"
  ON public.ai_generation_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.order_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  generation_run_id uuid REFERENCES public.ai_generation_runs(id) ON DELETE SET NULL,
  asset_kind text NOT NULL CHECK (asset_kind IN ('source', 'ai_result', 'order_main', 'regenerated')),
  url text NOT NULL,
  label text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read order assets" ON public.order_assets;
CREATE POLICY "Admins can read order assets"
  ON public.order_assets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event_name text NOT NULL,
  category text,
  step integer,
  order_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert funnel events" ON public.funnel_events;
CREATE POLICY "Anyone can insert funnel events"
  ON public.funnel_events FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read funnel events" ON public.funnel_events;
CREATE POLICY "Admins can read funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS order_status_events_order_id_idx ON public.order_status_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_assets_order_id_idx ON public.order_assets(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generation_runs_order_id_idx ON public.ai_generation_runs(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_generation_runs_session_id_idx ON public.ai_generation_runs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS funnel_events_session_id_idx ON public.funnel_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS funnel_events_event_name_idx ON public.funnel_events(event_name, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_order_fulfillment_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.shipped_at IS NULL THEN
      NEW.shipped_at = now();
    END IF;

    IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_order_fulfillment_timestamps ON public.orders;
CREATE TRIGGER sync_order_fulfillment_timestamps
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_fulfillment_timestamps();

CREATE OR REPLACE FUNCTION public.log_order_status_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_events (order_id, status, tracking_number, courier_name, note, source)
    VALUES (NEW.id, NEW.status, NEW.tracking_number, NEW.courier_name, NULLIF(NEW.fulfillment_note, ''), 'order_created');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.tracking_number IS DISTINCT FROM NEW.tracking_number OR
    OLD.courier_name IS DISTINCT FROM NEW.courier_name OR
    OLD.fulfillment_note IS DISTINCT FROM NEW.fulfillment_note
  ) THEN
    INSERT INTO public.order_status_events (order_id, status, tracking_number, courier_name, note, source)
    VALUES (NEW.id, NEW.status, NEW.tracking_number, NEW.courier_name, NULLIF(NEW.fulfillment_note, ''), 'order_updated');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_order_status_event_insert ON public.orders;
CREATE TRIGGER log_order_status_event_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_event();

DROP TRIGGER IF EXISTS log_order_status_event_update ON public.orders;
CREATE TRIGGER log_order_status_event_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_event();
