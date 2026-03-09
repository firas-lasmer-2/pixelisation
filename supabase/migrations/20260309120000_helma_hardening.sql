DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
CREATE POLICY "Admins can view orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read own cart" ON public.abandoned_carts;

DROP POLICY IF EXISTS "Anyone can read regeneration requests" ON public.regeneration_requests;
CREATE POLICY "Admins can view regeneration requests"
  ON public.regeneration_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.create_order_with_coupon(
  _order_ref text,
  _instruction_code text,
  _kit_size text,
  _art_style text,
  _category text,
  _dream_job text,
  _photo_url text,
  _is_gift boolean,
  _gift_message text,
  _contact_first_name text,
  _contact_last_name text,
  _contact_phone text,
  _contact_email text,
  _shipping_address text,
  _shipping_city text,
  _shipping_governorate text,
  _shipping_postal_code text,
  _coupon_code text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, total_price integer, discount_amount integer, coupon_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_price integer;
  v_discount integer := 0;
  v_final_price integer;
  v_coupon public.coupons%ROWTYPE;
BEGIN
  v_base_price := CASE _kit_size
    WHEN 'stamp_kit_40x50' THEN 449
    WHEN 'stamp_kit_30x40' THEN 349
    WHEN 'stamp_kit_A4' THEN 249
    ELSE NULL
  END;

  IF v_base_price IS NULL THEN
    RAISE EXCEPTION 'ORDER_INVALID_SIZE';
  END IF;

  IF NULLIF(trim(_art_style), '') IS NULL THEN
    RAISE EXCEPTION 'ORDER_INVALID_STYLE';
  END IF;

  IF _coupon_code IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM public.coupons
    WHERE code = upper(_coupon_code)
      AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'COUPON_INVALID';
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
      RAISE EXCEPTION 'COUPON_EXPIRED';
    END IF;

    IF v_coupon.max_uses IS NOT NULL AND v_coupon.used_count >= v_coupon.max_uses THEN
      RAISE EXCEPTION 'COUPON_EXHAUSTED';
    END IF;

    IF v_coupon.min_order > v_base_price THEN
      RAISE EXCEPTION 'COUPON_MIN_ORDER';
    END IF;

    v_discount := CASE
      WHEN v_coupon.discount_type = 'percentage' THEN round(v_base_price * v_coupon.discount_value / 100.0)
      ELSE LEAST(v_coupon.discount_value, v_base_price)
    END;

    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = v_coupon.id;
  END IF;

  v_final_price := GREATEST(0, v_base_price - v_discount);

  INSERT INTO public.orders (
    order_ref,
    instruction_code,
    kit_size,
    art_style,
    photo_url,
    is_gift,
    gift_message,
    contact_first_name,
    contact_last_name,
    contact_phone,
    contact_email,
    shipping_address,
    shipping_city,
    shipping_governorate,
    shipping_postal_code,
    total_price,
    category,
    dream_job,
    coupon_code,
    discount_amount
  )
  VALUES (
    _order_ref,
    _instruction_code,
    _kit_size,
    _art_style,
    _photo_url,
    coalesce(_is_gift, false),
    coalesce(_gift_message, ''),
    _contact_first_name,
    _contact_last_name,
    _contact_phone,
    coalesce(_contact_email, ''),
    _shipping_address,
    _shipping_city,
    _shipping_governorate,
    coalesce(_shipping_postal_code, ''),
    v_final_price,
    coalesce(_category, 'classic'),
    nullif(_dream_job, ''),
    CASE WHEN v_coupon.id IS NULL THEN NULL ELSE v_coupon.code END,
    v_discount
  )
  RETURNING id, orders.total_price, orders.discount_amount, orders.coupon_code
  INTO order_id, total_price, discount_amount, coupon_code;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_coupon(text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_coupon(text, text, text, text, text, text, text, boolean, text, text, text, text, text, text, text, text, text, text) TO service_role;
