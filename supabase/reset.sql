-- Reset all data and return the app to first-run state.
-- Run with: bun db:reset
-- After running, open http://localhost:3000 and complete the setup wizard.

TRUNCATE TABLE
  public.sale_items,
  public.paid_loans,
  public.purchase_payments,
  public.employee_actions,
  public.warehouse_products,
  public.warehouse_users,
  public.dollar_history,
  public.backup_runs,
  public.sales,
  public.company_purchases,
  public.expenses,
  public.employees,
  public.products,
  public.customers,
  public.companies,
  public.warehouses,
  public.user_permissions,
  public.profiles
CASCADE;

UPDATE public.site_settings SET
  setup_completed  = false,
  factory_name     = 'My Factory',
  primary_color    = '#0ea5e9',
  accent_color     = '#22c55e',
  language         = 'ckb',
  direction        = 'rtl',
  base_currency    = 'IQD',
  display_currency = 'IQD'
WHERE id = 1;

UPDATE public.dollar SET price = 1500 WHERE id = 1;

-- Clear auth tables in dependency order so gotrue starts clean.
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.users;
