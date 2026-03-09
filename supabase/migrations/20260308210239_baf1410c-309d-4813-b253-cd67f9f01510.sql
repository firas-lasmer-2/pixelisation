
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL,
  min_order integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can validate a coupon (read)
CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT USING (true);

-- Only admins can manage coupons
CREATE POLICY "Admins can insert coupons" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update coupons" ON public.coupons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete coupons" ON public.coupons FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add coupon_code and discount_amount to orders
ALTER TABLE public.orders ADD COLUMN coupon_code text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN discount_amount integer NOT NULL DEFAULT 0;

-- Abandoned carts table
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  kit_size text DEFAULT NULL,
  art_style text DEFAULT NULL,
  contact_phone text DEFAULT NULL,
  contact_email text DEFAULT NULL,
  contact_first_name text DEFAULT NULL,
  step_reached integer NOT NULL DEFAULT 1,
  photo_uploaded boolean NOT NULL DEFAULT false,
  recovered boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert/update abandoned carts (anonymous users)
CREATE POLICY "Anyone can insert abandoned carts" ON public.abandoned_carts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own cart" ON public.abandoned_carts FOR UPDATE USING (true);

-- Admins can read all abandoned carts
CREATE POLICY "Admins can read abandoned carts" ON public.abandoned_carts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Also allow anyone to read their own cart by session_id (for upsert)
CREATE POLICY "Anyone can read own cart" ON public.abandoned_carts FOR SELECT USING (true);
