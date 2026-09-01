-- 20260510000022: atomic create_sale RPC
--
-- Wraps INSERT into sales + INSERT into sale_items + adjust_warehouse_qty(-qty)
-- in a single transaction. Validates:
--   - permission (sales:write)
--   - every referenced product is active (not soft-deleted)
--   - warehouse stock is sufficient when warehouse_id is set
--   - discount <= subtotal
--
-- Frontend createSale becomes a thin wrapper around this RPC.

CREATE OR REPLACE FUNCTION public.create_sale(
  p_customer_id    bigint,
  p_warehouse_id   integer,
  p_sale_number    text,
  p_sale_type      text,
  p_discount       numeric,
  p_dollar         numeric,
  p_note           text,
  p_items          jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id  bigint;
  v_subtotal numeric := 0;
  v_total    numeric;
  v_item     jsonb;
  v_pid      integer;
  v_qty      integer;
BEGIN
  IF NOT public.has_permission('sales','write') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'sale must have at least one item';
  END IF;

  -- Validate items + accumulate subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_subtotal := v_subtotal
      + ((v_item->>'price')::numeric * (v_item->>'quantity')::int);

    IF NULLIF(v_item->>'product_id','') IS NOT NULL THEN
      v_pid := (v_item->>'product_id')::int;
      v_qty := (v_item->>'quantity')::int;

      PERFORM 1 FROM public.products
        WHERE id = v_pid AND deleted_at IS NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'product % not found or deleted', v_pid;
      END IF;

      IF p_warehouse_id IS NOT NULL THEN
        IF COALESCE(
             (SELECT qty FROM public.warehouse_products
                WHERE warehouse_id = p_warehouse_id AND product_id = v_pid),
             0
           ) < v_qty
        THEN
          RAISE EXCEPTION 'insufficient stock for product %', v_pid;
        END IF;
      END IF;
    END IF;
  END LOOP;

  IF p_discount > v_subtotal THEN
    RAISE EXCEPTION 'discount exceeds subtotal';
  END IF;
  v_total := v_subtotal - p_discount;

  INSERT INTO public.sales
    (customer_id, sale_number, sale_type, discount, dollar, note,
     warehouse_id, total_amount, total_remaining, is_finished)
  VALUES
    (p_customer_id, p_sale_number, p_sale_type::public.sale_type,
     p_discount, p_dollar, p_note, p_warehouse_id, v_total,
     CASE WHEN p_sale_type = 'LOAN' THEN v_total ELSE 0 END,
     p_sale_type = 'CASH')
  RETURNING id INTO v_sale_id;

  INSERT INTO public.sale_items (sale_id, product_id, name, price, quantity)
  SELECT v_sale_id,
         NULLIF(elem->>'product_id','')::int,
         elem->>'name',
         (elem->>'price')::numeric,
         (elem->>'quantity')::int
  FROM jsonb_array_elements(p_items) AS elem;

  IF p_warehouse_id IS NOT NULL THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      IF NULLIF(v_item->>'product_id','') IS NOT NULL THEN
        PERFORM public.adjust_warehouse_qty(
          p_warehouse_id,
          (v_item->>'product_id')::int,
          -((v_item->>'quantity')::int)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sale(
  bigint, integer, text, text, numeric, numeric, text, jsonb
) TO authenticated;
