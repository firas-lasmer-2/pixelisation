
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'classic';
ALTER TABLE public.abandoned_carts ADD COLUMN IF NOT EXISTS category text DEFAULT 'classic';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dream_job text;
