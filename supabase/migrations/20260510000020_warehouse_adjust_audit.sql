-- 20260510000020: warehouse adjustment audit
--
-- Adds an append-only audit log for manual stock adjustments and a wrapped RPC
-- (adjust_warehouse_qty_audited) that:
--   - requires a non-empty reason
--   - is OWNER/ADMIN-only
--   - writes a row to warehouse_adjustments alongside the qty change
--
-- Tightens the underlying adjust_warehouse_qty so a USER role can only adjust
-- warehouses they're assigned to (warehouse_users). Internal callers (sales,
-- purchases, soft/restore RPCs) keep working because those flows already gate
-- warehouse access at the application layer.

-- 1. Audit log table (append-only)
CREATE TABLE IF NOT EXISTS public.warehouse_adjustments (
  id            bigserial PRIMARY KEY,
  warehouse_id  integer NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id    integer NOT NULL REFERENCES public.products(id),
  delta         integer NOT NULL,
  reason        text    NOT NULL CHECK (length(trim(reason)) > 0),
  adjusted_by   uuid    REFERENCES public.profiles(id) ON DELETE SET NULL,
  adjusted_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS warehouse_adjustments_wh_idx
  ON public.warehouse_adjustments (warehouse_id, adjusted_at DESC);

ALTER TABLE public.warehouse_adjustments ENABLE ROW LEVEL SECURITY;

-- Read: OWNER + ADMIN can see all adjustments. USER role cannot read at all
-- (Adjust is OWNER/ADMIN-only anyway).
DROP POLICY IF EXISTS warehouse_adjustments_read ON public.warehouse_adjustments;
CREATE POLICY warehouse_adjustments_read
  ON public.warehouse_adjustments
  FOR SELECT TO authenticated
  USING (public.is_admin_or_owner());

-- No INSERT/UPDATE/DELETE policies — writes go through the SECURITY DEFINER RPC only.

-- 2. Tighten adjust_warehouse_qty: USER role must own the warehouse.
CREATE OR REPLACE FUNCTION public.adjust_warehouse_qty(
  p_warehouse_id integer,
  p_product_id   integer,
  p_delta        integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.current_role();
  IF v_role = 'USER' THEN
    PERFORM 1 FROM public.warehouse_users
      WHERE warehouse_id = p_warehouse_id AND profile_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'forbidden: warehouse access';
    END IF;
  END IF;

  INSERT INTO public.warehouse_products (warehouse_id, product_id, qty)
  VALUES (p_warehouse_id, p_product_id, GREATEST(0, p_delta))
  ON CONFLICT (warehouse_id, product_id) DO UPDATE
    SET qty = GREATEST(0, public.warehouse_products.qty + p_delta),
        updated_at = now();
END;
$$;

-- 3. Audited wrapper for manual adjustments
CREATE OR REPLACE FUNCTION public.adjust_warehouse_qty_audited(
  p_warehouse_id integer,
  p_product_id   integer,
  p_delta        integer,
  p_reason       text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  v_role := public.current_role();
  IF v_role NOT IN ('OWNER','ADMIN') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  PERFORM public.adjust_warehouse_qty(p_warehouse_id, p_product_id, p_delta);

  INSERT INTO public.warehouse_adjustments
    (warehouse_id, product_id, delta, reason, adjusted_by)
  VALUES
    (p_warehouse_id, p_product_id, p_delta, trim(p_reason), auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_warehouse_qty_audited(integer, integer, integer, text)
  TO authenticated;

-- 4. Drop inventory:write from any USER who has it (defensive).
DELETE FROM public.user_permissions
  WHERE resource = 'inventory'
    AND action   = 'write'
    AND profile_id IN (SELECT id FROM public.profiles WHERE role = 'USER');
