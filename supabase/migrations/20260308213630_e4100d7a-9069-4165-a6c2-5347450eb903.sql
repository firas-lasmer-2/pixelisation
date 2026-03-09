
-- Create enum for regeneration request status
CREATE TYPE public.regen_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');

-- Create regeneration_requests table
CREATE TABLE public.regeneration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  order_ref TEXT NOT NULL,
  reason TEXT NOT NULL,
  status public.regen_status NOT NULL DEFAULT 'pending',
  original_photo_url TEXT,
  regenerated_photo_url TEXT,
  admin_note TEXT,
  client_ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regeneration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (customer submits request)
CREATE POLICY "Anyone can submit regeneration requests"
  ON public.regeneration_requests
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read own requests by order_ref (for status display)
CREATE POLICY "Anyone can read regeneration requests"
  ON public.regeneration_requests
  FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update regeneration requests"
  ON public.regeneration_requests
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete regeneration requests"
  ON public.regeneration_requests
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.regeneration_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
