-- Safe soft-delete / restore / hard-delete RPCs for sales and company_purchases.
-- These ensure inventory side-effects from createSale (adjust_warehouse_qty -qty
-- per item) are properly reversed on soft-delete and re-applied on restore.
-- Hard-delete on an active record reverses inventory before CASCADE.
--
-- For company_purchases there are no inventory side-effects today, so the RPCs
-- are simple wrappers around update/delete with permission gates.

-- ─────────────────────────────────────────────────────────────────────────────
-- Sales
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.soft_delete_sale(p_sale_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warehouse_id integer;
  v_item record;
begin
  if not public.has_permission('sales','delete') then
    raise exception 'forbidden: sales:delete required';
  end if;

  -- Lock the row; bail if missing or already soft-deleted (idempotent)
  perform 1 from public.sales
   where id = p_sale_id and deleted_at is null
   for update;
  if not found then
    raise exception 'sale % not found or already deleted', p_sale_id;
  end if;

  select warehouse_id into v_warehouse_id from public.sales where id = p_sale_id;

  -- Reverse inventory: add back what was deducted at sale creation
  if v_warehouse_id is not null then
    for v_item in
      select product_id, quantity
        from public.sale_items
       where sale_id = p_sale_id
         and product_id is not null
    loop
      perform public.adjust_warehouse_qty(v_warehouse_id, v_item.product_id, v_item.quantity);
    end loop;
  end if;

  update public.sales set deleted_at = now() where id = p_sale_id;
end;
$$;

create or replace function public.restore_sale(p_sale_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warehouse_id integer;
  v_item record;
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;

  perform 1 from public.sales
   where id = p_sale_id and deleted_at is not null
   for update;
  if not found then
    raise exception 'sale % not found or not deleted', p_sale_id;
  end if;

  select warehouse_id into v_warehouse_id from public.sales where id = p_sale_id;

  -- Re-apply inventory deduction. RPC floors at 0; caller may want to warn user
  -- if any product was short.
  if v_warehouse_id is not null then
    for v_item in
      select product_id, quantity
        from public.sale_items
       where sale_id = p_sale_id
         and product_id is not null
    loop
      perform public.adjust_warehouse_qty(v_warehouse_id, v_item.product_id, -v_item.quantity);
    end loop;
  end if;

  update public.sales set deleted_at = null where id = p_sale_id;
end;
$$;

create or replace function public.hard_delete_sale(p_sale_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warehouse_id integer;
  v_deleted_at   timestamptz;
  v_item record;
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;

  select warehouse_id, deleted_at
    into v_warehouse_id, v_deleted_at
    from public.sales
   where id = p_sale_id
   for update;
  if not found then
    raise exception 'sale % not found', p_sale_id;
  end if;

  -- If the sale is still active (no soft-delete), we owe inventory restoration
  -- before destroying the row. If already soft-deleted, inventory was reversed
  -- at that time — skip.
  if v_deleted_at is null and v_warehouse_id is not null then
    for v_item in
      select product_id, quantity
        from public.sale_items
       where sale_id = p_sale_id
         and product_id is not null
    loop
      perform public.adjust_warehouse_qty(v_warehouse_id, v_item.product_id, v_item.quantity);
    end loop;
  end if;

  -- CASCADE on sale_items.sale_id and paid_loans.sale_id removes children.
  delete from public.sales where id = p_sale_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Company purchases (no inventory side-effects today; thin wrappers)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.soft_delete_purchase(p_purchase_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('purchases','delete') then
    raise exception 'forbidden: purchases:delete required';
  end if;
  update public.company_purchases
     set deleted_at = now()
   where id = p_purchase_id and deleted_at is null;
  if not found then
    raise exception 'purchase % not found or already deleted', p_purchase_id;
  end if;
end;
$$;

create or replace function public.restore_purchase(p_purchase_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;
  update public.company_purchases
     set deleted_at = null
   where id = p_purchase_id and deleted_at is not null;
  if not found then
    raise exception 'purchase % not found or not deleted', p_purchase_id;
  end if;
end;
$$;

create or replace function public.hard_delete_purchase(p_purchase_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;
  -- CASCADE on purchase_payments.company_purchase_id removes children.
  delete from public.company_purchases where id = p_purchase_id;
  if not found then
    raise exception 'purchase % not found', p_purchase_id;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Generic restore/hard-delete for entities without side-effects.
-- One function per (table, id-type) keeps SECURITY DEFINER scope tight.
-- Frontend never calls these directly; the trash page server fns dispatch by
-- entity name. We use static SQL for safety (no dynamic table names).
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.restore_record(p_entity text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;

  case p_entity
    when 'sales'      then perform public.restore_sale(p_id);
    when 'purchases'  then perform public.restore_purchase(p_id);
    when 'customers'  then update public.customers   set deleted_at = null where id = p_id;
    when 'products'   then update public.products    set deleted_at = null where id = p_id;
    when 'employees'  then update public.employees   set deleted_at = null where id = p_id;
    when 'expenses'   then update public.expenses    set deleted_at = null where id = p_id;
    when 'companies'  then update public.companies   set deleted_at = null where id = p_id;
    when 'warehouses' then update public.warehouses  set deleted_at = null where id = p_id;
    else raise exception 'unsupported entity: %', p_entity;
  end case;
end;
$$;

create or replace function public.restore_record_uuid(p_entity text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;

  case p_entity
    when 'profiles' then update public.profiles set deleted_at = null where id = p_id;
    else raise exception 'unsupported entity: %', p_entity;
  end case;
end;
$$;

create or replace function public.hard_delete_record(p_entity text, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;

  case p_entity
    when 'sales'      then perform public.hard_delete_sale(p_id);
    when 'purchases'  then perform public.hard_delete_purchase(p_id);
    when 'customers'  then delete from public.customers   where id = p_id;
    when 'products'   then delete from public.products    where id = p_id;
    when 'employees'  then delete from public.employees   where id = p_id;
    when 'expenses'   then delete from public.expenses    where id = p_id;
    when 'companies'  then delete from public.companies   where id = p_id;
    when 'warehouses' then delete from public.warehouses  where id = p_id;
    else raise exception 'unsupported entity: %', p_entity;
  end case;
end;
$$;

create or replace function public.hard_delete_record_uuid(p_entity text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('trash','manage') then
    raise exception 'forbidden: trash:manage required';
  end if;

  case p_entity
    when 'profiles' then delete from public.profiles where id = p_id;
    else raise exception 'unsupported entity: %', p_entity;
  end case;
end;
$$;

-- Allow authenticated users to call these RPCs; the function bodies enforce
-- has_permission() so RLS gating is sufficient.
grant execute on function public.soft_delete_sale(bigint)        to authenticated;
grant execute on function public.restore_sale(bigint)            to authenticated;
grant execute on function public.hard_delete_sale(bigint)        to authenticated;
grant execute on function public.soft_delete_purchase(bigint)    to authenticated;
grant execute on function public.restore_purchase(bigint)        to authenticated;
grant execute on function public.hard_delete_purchase(bigint)    to authenticated;
grant execute on function public.restore_record(text, bigint)    to authenticated;
grant execute on function public.restore_record_uuid(text, uuid) to authenticated;
grant execute on function public.hard_delete_record(text, bigint) to authenticated;
grant execute on function public.hard_delete_record_uuid(text, uuid) to authenticated;
