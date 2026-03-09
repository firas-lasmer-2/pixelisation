
-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('confirmed', 'processing', 'shipped', 'delivered');

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref TEXT NOT NULL UNIQUE,
  instruction_code TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'confirmed',
  kit_size TEXT NOT NULL,
  art_style TEXT NOT NULL,
  photo_url TEXT,
  cropped_preview_url TEXT,
  is_gift BOOLEAN NOT NULL DEFAULT false,
  gift_message TEXT DEFAULT '',
  contact_first_name TEXT NOT NULL,
  contact_last_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_governorate TEXT NOT NULL,
  shipping_postal_code TEXT DEFAULT '',
  total_price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Orders: Anyone can INSERT (storefront)
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- Orders: Anyone can SELECT (for tracking by order_ref)
CREATE POLICY "Anyone can view orders"
  ON public.orders FOR SELECT
  USING (true);

-- Orders: Only admins can UPDATE
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Orders: Only admins can DELETE
CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: Only admins can view
CREATE POLICY "Admins can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for order photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-photos', 'order-photos', true);

CREATE POLICY "Anyone can upload order photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'order-photos');

CREATE POLICY "Order photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'order-photos');
