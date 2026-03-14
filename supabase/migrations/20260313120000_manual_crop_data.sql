ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS crop_data jsonb;

ALTER TABLE public.abandoned_carts
  ADD COLUMN IF NOT EXISTS crop_data jsonb;

COMMENT ON COLUMN public.orders.crop_data IS 'Saved crop coordinates for the uploaded image';
COMMENT ON COLUMN public.abandoned_carts.crop_data IS 'Saved crop coordinates for the uploaded image while checkout is in progress';
