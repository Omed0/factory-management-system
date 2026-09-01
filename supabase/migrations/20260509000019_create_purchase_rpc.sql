-- 20260509000019: atomic create_purchase RPC
-- Wraps INSERT into company_purchases + adjust_warehouse_qty in a single transaction
-- so a failed inventory adjust rolls back the purchase row. Permission check is
-- inside the function (matches the pattern in soft_delete_purchase / hard_delete_purchase).

CREATE OR REPLACE FUNCTION public.create_purchase(
  p_company_id     bigint,
  p_warehouse_id   integer,
  p_product_id     integer,
  p_quantity       integer,
  p_name           text,
  p_type           text,
  p_total_amount   numeric,
  p_dollar         numeric,
  p_purchase_date  timestamptz,
  p_note           text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  IF NOT public.has_permission('purchases','write') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_product_id IS NOT NULL THEN
    PERFORM 1 FROM public.products
      WHERE id = p_product_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'product % not found or deleted', p_product_id;
    END IF;
  END IF;

  INSERT INTO public.company_purchases
    (company_id, warehouse_id, product_id, quantity, name, type,
     total_amount, total_remaining, dollar, purchase_date, note)
  VALUES
    (p_company_id, p_warehouse_id, p_product_id, p_quantity, p_name,
     p_type::public.company_purchase_type,
     p_total_amount,
     CASE WHEN p_type = 'LOAN' THEN p_total_amount ELSE 0 END,
     p_dollar, p_purchase_date, p_note)
  RETURNING id INTO v_id;

  IF p_warehouse_id IS NOT NULL AND p_product_id IS NOT NULL AND p_quantity IS NOT NULL THEN
    PERFORM public.adjust_warehouse_qty(p_warehouse_id, p_product_id, p_quantity);
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_purchase(
  bigint, integer, integer, integer, text, text, numeric, numeric, timestamptz, text
) TO authenticated;
