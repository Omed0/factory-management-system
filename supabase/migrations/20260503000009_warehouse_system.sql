-- Warehouse system: warehouses, per-warehouse user access, per-warehouse inventory.
-- Products gain optional grains_per_carton for carton/grain display.
-- Transactional tables gain optional warehouse_id for traceability.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.warehouses (
  id          serial PRIMARY KEY,
  name        text        NOT NULL,
  description text,
  location    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

-- Which users have access to a warehouse (many-to-many).
CREATE TABLE public.warehouse_users (
  id           serial PRIMARY KEY,
  warehouse_id integer NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  profile_id   uuid    NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, profile_id)
);

-- Per-warehouse inventory: qty stored as base units (grains/pieces).
-- grains_per_carton on the product controls carton ↔ grain conversion in the app.
CREATE TABLE public.warehouse_products (
  id           serial PRIMARY KEY,
  warehouse_id integer NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id   integer NOT NULL REFERENCES public.products(id)   ON DELETE CASCADE,
  qty          integer NOT NULL DEFAULT 0 CHECK (qty >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, product_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Schema changes on existing tables
-- ─────────────────────────────────────────────────────────────────────────────

-- Products: how many grains/pieces per carton (null = carton system not used).
ALTER TABLE public.products
  ADD COLUMN grains_per_carton integer;

-- Link transactions to a warehouse (nullable = backward compat with existing data).
ALTER TABLE public.sales
  ADD COLUMN warehouse_id integer REFERENCES public.warehouses(id);

ALTER TABLE public.company_purchases
  ADD COLUMN warehouse_id integer REFERENCES public.warehouses(id);

ALTER TABLE public.expenses
  ADD COLUMN warehouse_id integer REFERENCES public.warehouses(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory helper: upsert + adjust qty atomically; floor at 0.
-- ─────────────────────────────────────────────────────────────────────────────

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
BEGIN
  INSERT INTO public.warehouse_products(warehouse_id, product_id, qty, updated_at)
  VALUES (p_warehouse_id, p_product_id, GREATEST(0, p_delta), now())
  ON CONFLICT (warehouse_id, product_id)
  DO UPDATE SET
    qty        = GREATEST(0, warehouse_products.qty + p_delta),
    updated_at = now();
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.warehouses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_products ENABLE ROW LEVEL SECURITY;

-- Warehouses: all authenticated staff can view; only ADMIN/OWNER can mutate.
CREATE POLICY "warehouses select" ON public.warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "warehouses insert" ON public.warehouses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "warehouses update" ON public.warehouses
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "warehouses delete" ON public.warehouses
  FOR DELETE TO authenticated
  USING (public.is_admin_or_owner());

-- Warehouse users assignment: ADMIN/OWNER only.
CREATE POLICY "warehouse_users select" ON public.warehouse_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "warehouse_users write" ON public.warehouse_users
  FOR ALL TO authenticated
  USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- Inventory: any authenticated user can view; writes go through server fns
-- (which call adjust_warehouse_qty SECURITY DEFINER), but we also need direct
-- insert/update for the admin UI inventory adjustments.
CREATE POLICY "wh_products select" ON public.warehouse_products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wh_products write" ON public.warehouse_products
  FOR ALL TO authenticated
  USING (public.is_authenticated_user()) WITH CHECK (public.is_authenticated_user());
