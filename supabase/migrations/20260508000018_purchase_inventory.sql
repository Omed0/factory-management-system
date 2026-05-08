-- Add product_id and quantity to company_purchases (nullable; backward-compatible)
ALTER TABLE public.company_purchases
  ADD COLUMN IF NOT EXISTS product_id integer REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS quantity   integer CHECK (quantity IS NULL OR quantity > 0);

-- soft_delete_purchase: reverse warehouse inventory when applicable, then soft-delete
CREATE OR REPLACE FUNCTION public.soft_delete_purchase(p_purchase_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wh  integer;
  v_pid integer;
  v_qty integer;
BEGIN
  IF NOT public.has_permission('purchases', 'delete') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM 1 FROM public.company_purchases
    WHERE id = p_purchase_id AND deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase % not found or already deleted', p_purchase_id;
  END IF;

  SELECT warehouse_id, product_id, quantity
    INTO v_wh, v_pid, v_qty
    FROM public.company_purchases WHERE id = p_purchase_id;

  IF v_wh IS NOT NULL AND v_pid IS NOT NULL AND v_qty IS NOT NULL THEN
    PERFORM public.adjust_warehouse_qty(v_wh, v_pid, -v_qty);
  END IF;

  UPDATE public.company_purchases SET deleted_at = now() WHERE id = p_purchase_id;
END;
$$;

-- restore_purchase: re-apply inventory then clear deleted_at
CREATE OR REPLACE FUNCTION public.restore_purchase(p_purchase_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wh  integer;
  v_pid integer;
  v_qty integer;
BEGIN
  IF NOT public.has_permission('trash', 'manage') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM 1 FROM public.company_purchases
    WHERE id = p_purchase_id AND deleted_at IS NOT NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase % not found or not deleted', p_purchase_id;
  END IF;

  SELECT warehouse_id, product_id, quantity
    INTO v_wh, v_pid, v_qty
    FROM public.company_purchases WHERE id = p_purchase_id;

  IF v_wh IS NOT NULL AND v_pid IS NOT NULL AND v_qty IS NOT NULL THEN
    PERFORM public.adjust_warehouse_qty(v_wh, v_pid, v_qty);
  END IF;

  UPDATE public.company_purchases SET deleted_at = null WHERE id = p_purchase_id;
END;
$$;

-- hard_delete_purchase: if record is still active reverse inventory first, then delete permanently
CREATE OR REPLACE FUNCTION public.hard_delete_purchase(p_purchase_id bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wh  integer;
  v_pid integer;
  v_qty integer;
  v_del timestamptz;
BEGIN
  IF NOT public.has_permission('trash', 'manage') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT warehouse_id, product_id, quantity, deleted_at
    INTO v_wh, v_pid, v_qty, v_del
    FROM public.company_purchases WHERE id = p_purchase_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase % not found', p_purchase_id;
  END IF;

  IF v_del IS NULL AND v_wh IS NOT NULL AND v_pid IS NOT NULL AND v_qty IS NOT NULL THEN
    PERFORM public.adjust_warehouse_qty(v_wh, v_pid, -v_qty);
  END IF;

  DELETE FROM public.company_purchases WHERE id = p_purchase_id;
END;
$$;
