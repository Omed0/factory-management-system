# Progress

Last updated: 2026-05-08 (Round 8: discount validation, % toggle, overselling block, reset scripts, money audit)

## Done

### Infrastructure
- [x] Self-hosted Supabase Docker stack (13 containers: Kong, Auth, REST, Realtime, Storage, Studio, Analytics, Pooler, Vector, imgproxy, Edge Functions, DB, db-config)
- [x] `supabase/bootstrap.sh` — vendors official docker tree; pinned ref
- [x] `supabase/docker-compose.prod.yml` — Caddy TLS overlay + app container + resource limits
- [x] `supabase/Caddyfile` — TLS, HSTS, Studio basic-auth, security headers
- [x] `Dockerfile` — multi-stage bun build, non-root user, `/healthz` healthcheck
- [x] Setup scripts (`scripts/setup.sh` + `scripts/setup.ps1`) — 4 modes: dev / prod / deploy:vps / deploy:cf
- [x] CI workflow (`.github/workflows/ci.yml`) — typecheck + build + SQL migration smoke-test on push/PR
- [x] Release workflow (`.github/workflows/release.yml`) — Docker image → ghcr.io + optional CF deploy on `v*` tag
- [x] `deploy/vps/harden.sh` — UFW, fail2ban, Docker, 2 GB swap, healthcheck cron
- [x] `deploy/cloudflare/wrangler.toml` — CF Workers config + R2 bucket binding
- [x] `DEPLOY_TARGET=cloudflare` build path via `@cloudflare/vite-plugin`
- [x] `.env.example` — all required vars documented with safe defaults

### Database (16 migrations)
- [x] `0001_initial_schema` — all tables, enums, triggers, `site_settings` singleton, `dollar` rate table
- [x] `0002_rls_policies` — RLS on all tables, `has_permission()`, `is_owner()`, `is_admin_or_owner()`, `is_authenticated_user()`
- [x] `0003_storage_and_cron` — storage buckets (branding, products, employees, backups), pg_cron nightly backup job, `reschedule_backup_cron` trigger
- [x] `0004_permissions` — `permission_catalog` (31 resource×action pairs), `user_permissions`, role-aware policies
- [x] `0005_security_hardening` — `search_path` hardening on all functions, tighter per-role storage/dollar policies
- [x] `0006_backup_credentials` — R2 credential columns (`r2_endpoint`, `r2_bucket`, `r2_access_key_id`, `r2_secret_access_key`) on `site_settings`
- [x] `0007_restore_sequences` — sequence reset helper for data restore
- [x] `0008_fix_backup_default` — backup_provider default → 'supabase'; fixes employees storage policy to allow all authenticated users
- [x] `0009_warehouse_system` — `warehouses`, `warehouse_users`, `warehouse_products` tables + RLS; `grains_per_carton` on products; `warehouse_id` FK on sales/purchases/expenses; `adjust_warehouse_qty()` SECURITY DEFINER RPC
- [x] `0010_warehouse_permissions` — 5 new permission_catalog entries (warehouses:view/write/delete, inventory:view/write)
- [x] `0011_safe_soft_delete` — SECURITY DEFINER RPCs for transactional soft-delete/restore/hard-delete for sales (with inventory reversal) and purchases; generic dispatcher for other entities
- [x] `0012_trash_permissions` — `trash:manage` entry in permission_catalog
- [x] `0013_categories_and_history` — `expenses.category` column + `dollar_history` table with auto-track trigger
- [x] `20260508000014_fix_storage_policies` — Split `products`/`branding` storage INSERT policies to use `auth.uid() IS NOT NULL` (was `is_authenticated_user()` which fails on race conditions); UPDATE/DELETE still require profile verification
- [x] `20260508000015_employee_terminate_action` — `ALTER TYPE employee_action_type ADD VALUE 'TERMINATE'`
- [x] `20260508000016_profile_phone` — `ALTER TABLE profiles ADD COLUMN phone text`

### App — core
- [x] First-run setup wizard (`/setup`) — factory name, locale, colors, OWNER account
- [x] Auth — Supabase password sign-in, session cookies, server-side RLS
- [x] Root route — dynamic branding tokens applied as CSS vars before paint, no rebuild needed
- [x] Auth-protected layout (`/app/route.tsx`) — sidebar, nav, permission-gated menu items
- [x] `/healthz` — liveness probe (200 = DB reachable, 503 = DB down)
- [x] Env validation schema (`src/lib/env.server.ts`) — zod, fails fast on missing vars
- [x] Supabase client split — `getSupabaseServer()` (RLS on) · `getSupabaseAdmin()` (service-role) · `getSupabaseBrowser()` (anon, browser)
- [x] `src/lib/auth.ts` — `requireUser()`, `loadPermissions()`, `can()`
- [x] TypeScript types generated from live DB (`bun run gen:types`)

### App — modules
- [x] Dashboard (`/app/dashboard`) — KPI summary cards + monthly revenue area chart (last 6 months); currency reads from `display_currency`
- [x] Customers (`/app/customers`) — full CRUD, soft delete
- [x] Products (`/app/products`) — CRUD + Supabase Storage image upload + optional `grains_per_carton` field
- [x] Employees (`/app/employees`) — CRUD + actions (bonus / punishment / absent / overtime / TERMINATE), dollar snapshot; TERMINATE auto-soft-deletes employee; individual action records can be deleted; `useStore(form.store, …)` for reactive TERMINATE toggle
- [x] Sales (`/app/sales`) — multi-line sale entry, cash/loan, loan-payment collection, dollar snapshot; warehouse selector (inventory auto-decremented on create); `total_amount` recalculated server-side
- [x] Companies (`/app/companies`) — supplier CRUD
- [x] Purchases (`/app/purchases`) — supplier purchases + cash/installment payments, dollar snapshot; warehouse selector for association
- [x] Expenses (`/app/expenses`) — CRUD, dollar snapshot, category field (free-text for expense breakdown chart)
- [x] Dollar rate (`/app/dollar`) — current IQD/USD rate + history
- [x] Reports (`/app/reports`) — monthly aggregations + **line chart** (sales/expenses/purchases); **Profit view** shows both cash-based and accrual profit as dual-line chart; **Financial Audit** view (full cash-flow equality, prorated payroll with per-employee day breakdown, net balance); quick-range buttons; analytics section: top products + top customers (horizontal bar), expense breakdown (pie), dollar rate history (line chart); TERMINATE excluded from deduction_total
- [x] Warehouses (`/app/warehouses`) — CRUD; user assignment; per-product inventory with carton/grain display; manual stock adjustment (nav item always visible via ESSENTIAL_PERMISSIONS fallback)
- [x] Dashboard (`/app/dashboard`) — KPI cards (including outstanding payables); 6-month area chart; recent activity feed (sales/purchases/expenses merged); low-stock alerts; top 5 products today; **Outstanding Loans vs Payables** bar chart; **Cash vs Loan Sales** pie chart (all-time)
- [x] Trash manager (`/app/settings/trash`) — tabs for all 9 entity types; restore (with inventory re-adjustment for sales) and hard-delete (permanent, with confirm); warehouse stock warning on sale restore
- [x] Settings — branding editor (factory name, colors, currency dropdowns for base + display)
- [x] Settings — user management + permission grid; OWNER-only ADMIN promotion; "Edit my profile" (name + phone + password); ADMIN can edit USER profiles but not OWNER; `updateUserProfile` server fn with role-guard; `requireUser()` added to `listUsers`/`listCatalog`/`listGrants`
- [x] Settings — backup config (provider, cron, retention), manual trigger, run history
- [x] Settings — **ESSENTIAL_PERMISSIONS** fallback: OWNER/ADMIN always get the full permission set even if `permission_catalog` migrations are missing; missing-migration banner shown in settings
- [x] **i18n** — `react-i18next` with cookie-based language detection; Kurdish Sorani (ckb, default), Arabic (ar), English (en); all UI strings wrapped with `t()`

### Backup pipeline
- [x] `supabase/functions/backup/index.ts` — logical NDJSON export, gzip, R2 or Supabase Storage upload, rotation
- [x] pg_cron job `fms-nightly-backup` — default 03:00 UTC, schedule rebuilt by trigger on `site_settings.backup_cron` change
- [x] `backup_runs` table — tracks status, size, destination, timing per run

### Infrastructure & routing fixes (2026-05-07)
- [x] **Migration script** — `scripts/migrate.ps1` + `scripts/migrate.sh`: idempotent, transaction-wrapped, tracks applied files in `public.schema_migrations`; added `supabase:migrate:all` / `supabase:migrate:win` npm scripts
- [x] **Trash route registered** — added `AppSettingsTrashRoute` to `routeTree.gen.ts` so `/app/settings/trash` is reachable
- [x] **healthz import-protection fix** — DB ping moved into a `createServerFn` so the `supabase.server` import is in a server-only handler, not flagged by Vite's import-protection plugin
- [x] **Vite plugin switch** — replaced `@vitejs/plugin-react-swc` with `@vitejs/plugin-react` (both installed); eliminates the `preamble` HMR warning in dev mode
- [x] **vite.config.ts cleanup** — removed stale `generatedRouteTree: "./routeTree.ts"` path (file doesn't exist; `enableRouteGeneration: false` already disables generation)

### Security hardening (2026-05-07)
- [x] **XSS fix** — `escapeHtml()` helper added to `sales.tsx` and `purchases.tsx`; all user-controlled strings (customer name/phone, item names, notes, company name) escaped before interpolation into print HTML templates
- [x] **Backup restore 502 fix** — file uploads now go direct from browser to Supabase Storage (bypassing Kong body limit); new `restoreFromStorageKey` server fn downloads from storage and applies restore; temp upload cleaned up after restore
- [x] **Trash server fn auth** — `restoreItem` and `hardDeleteItem` in `settings/trash.tsx` now check `has_permission('trash','manage')` inside the handler (was only checked via route guard)
- [x] **`listRuns` auth** — now requires OWNER or ADMIN role (was only `requireUser()`)
- [x] **Modal horizontal scroll** — all `<table>` elements inside `DialogContent` wrapped in `<div className="overflow-x-auto">`; `SaleDialog` items grid wrapped in `overflow-x-auto` + `min-w-140` container

### Bug fixes & warehouse user scoping (2026-05-08)
- [x] **Profiles RLS infinite recursion fix** — all `profiles` UPDATE calls in `settings/users.tsx` (`updateUserProfile`, `changeRole`, `softDeleteUser`, `updateOwnProfile`) switched to `getSupabaseAdmin()` (service-role bypasses RLS); application-level role guards remain the security gate; fixes "infinite recursion detected in policy for relation profiles" error
- [x] **Warehouse qty display fix** — `qtyDisplay()` in `warehouses.tsx` no longer shows "0 کارتۆن + N دانە" when cartons=0; now shows just "N دانە" (grains only) or "N کارتۆن" (whole cartons only) or "N کارتۆن + N دانە"
- [x] **Warehouse user scoping** — USER-role accounts now see only data from their assigned warehouse(s); OWNER/ADMIN see everything; affects: Sales list/create, Purchases list/create, Products list, Warehouses list, Dashboard KPIs; `AuthedUser` extended with `warehouse_ids: number[]`; `warehouseFilter(me)` helper returns `number[] | null`; product picker in sale/purchase forms filters to warehouse inventory when warehouse is selected
- [x] **Supabase package upgrade** — upgraded `@supabase/ssr` (0.5.2 → 0.10.3) and `@supabase/supabase-js` (2.46.1 → 2.105.3) to fix TypeScript `never` type errors caused by `SupabaseClient` generic signature change in 2.x; `supabase.server.ts` updated to single-param `createClient<Database>` / `createServerClient<Database>`
- [x] **Migration 0013 applied** — `expenses.category` column added to live DB (was skipped in earlier run); types regenerated

### Currency unification, print fix, search UX (Round 6, 2026-05-08)
- [x] **Currency unification** — removed separate `base_currency`/`display_currency` selectors in branding; single "Currency" selector now sets both to the same value; all pages respect it
- [x] **`formatMoney` utility** — `src/lib/currency.ts` — `formatMoney(iqd, currency, dollarRate)` converts IQD→USD when currency=USD using current rate; all display locations (dashboard, warehouse, reports, sales, purchases, expenses, employees, products) use it
- [x] **Dollar rate in router context** — `bootstrap()` fetches current dollar rate; passed as `dollarRate` in `RouterContext`; all child routes can access it
- [x] **Print CSS** — `@media print` block in `src/styles/app.css` removes max-height/overflow constraints so scrolled content prints fully; hides sidebar/header/buttons
- [x] **Dollar rate per 100 USD** — `dollar.tsx` now inputs/displays rate as per-100-USD (user types 150,000; stored as 1500); history shows same scale; i18n updated to "per 100 USD" in all 3 locales
- [x] **Search clear button** — `DataTable` search input now shows an × button when a filter is active, clearing it instantly; applies to all pages with `searchKey`

### Print popup fix, purchase inventory, stock display (Round 7, 2026-05-08)
- [x] **Print popup fix** — `printHtml()` in `sales.tsx` and `purchases.tsx` now removes fixed `height=1100`, uses `w.onload = () => w.print()` instead of `setTimeout`; both invoice/receipt `<style>` blocks embed `@page { size: A4; margin: 15mm }` + `@media print { body { overflow: visible; height: auto } }` so full content prints on A4 regardless of length
- [x] **Purchase inventory** — migration `0018` adds `product_id` (nullable FK) + `quantity` (nullable int) to `company_purchases`; re-creates `soft_delete_purchase`, `restore_purchase`, `hard_delete_purchase` RPCs to reverse/re-apply `adjust_warehouse_qty` when all three of warehouse/product/qty are set; `upsert` server fn calls `adjust_warehouse_qty(+qty)` after INSERT; `PurchaseDialog` shows optional product picker + quantity input when a warehouse is selected (with current-stock hint); "Product / Qty" column added to purchases table; product+qty shown in `PurchaseDetailDialog`
- [x] **`src/lib/inventory.ts`** — extracted shared `qtyDisplay(qty, gpc)` helper; `warehouses.tsx` now imports from it instead of a local copy
- [x] **Stock in product picker (sales)** — `listProducts` now returns `qty` + `grains_per_carton` from `warehouse_products` join when `warehouse_id` is provided; sale form product `<SelectItem>` appends `— N کارتۆن` (or grains) so agent can see available stock inline
- [x] **Stock column on products list** — `listProductStock` server fn aggregates `warehouse_products.qty` totals per product; "Stock" column shown on products page using `qtyDisplay`; invalidated on soft-delete and save
- [x] **i18n** — added `purchases.product`, `purchases.qty`, `purchases.stockHint`, `products.stock` to all 3 locale files (en, ckb, ar)

### Discount validation, overselling block, reset scripts, money audit (Round 8, 2026-05-08)
- [x] **Discount server-side guard** — `createSale` now computes subtotal first; throws `"Discount cannot exceed the sale total"` if `discount > subtotal`; total stored in DB is always `≥ 0`
- [x] **Overselling block** — `createSale` checks each item's available qty in `warehouse_products` before inserting; throws `"Insufficient stock: X needs N, has M"` per shortfall; preserves the mathematical inventory equity invariant (`current_stock = Σpurchases − Σsales`)
- [x] **% discount toggle** — `SaleDialog` has an IQD|% toggle next to the discount label; % mode auto-computes the IQD discount from `(pct/100) × subtotal` and stores it via `form.setFieldValue`; toggle is UI-only, discount always written to DB in absolute IQD
- [x] **Before/after summary** — discount area shows a muted row `subtotal → −discount → total` when discount > 0, giving visual confirmation before submitting
- [x] **Client-side discount error** — inline error below discount field + disabled submit button when discount exceeds subtotal
- [x] **Discount area layout redesign** — replaced 3-column `grid-cols-3` (discount | USD rate | total) with 2-column top row (discount+toggle | USD rate) + conditional summary row + full-width total row
- [x] **RTL margin fix** — `ml-1` → `ms-1` (margin-inline-start) in stock display spans in `sales.tsx` and `purchases.tsx` (3 locations in purchases, 1 in sales)
- [x] **`formatMoney` division-by-zero** — already guarded by `if (currency === "USD" && dollarRate > 0)` (confirmed correct; no change needed)
- [x] **DB reset** — `supabase/reset.sql` truncates all tables, resets `site_settings` to defaults, clears `auth.users`; `package.json` `db:reset` pipes it via `docker exec -i supabase-db psql`; after running open localhost:3000 and run setup wizard
- [x] **i18n** — added `sales.discountExceedsTotal`, `sales.discountPct`, `sales.insufficientStock`, `sales.needs`, `sales.has` to all 3 locale files (en, ckb, ar)

### Storage, currency, UX fixes (Round 5, 2026-05-08)
- [x] **Storage upload fixed** — `supabase.browser.ts` switched from `createClient` (localStorage session) to `createBrowserClient` from `@supabase/ssr` (cookie session, compatible with server client); fixes "new row violates row-level security policy" on all bucket uploads; migration 0017 also fixes `employees` bucket INSERT policy (was `ALL` with `is_authenticated_user()` → split into INSERT/UPDATE/DELETE; INSERT now uses `auth.uid() IS NOT NULL`)
- [x] **Currency display fix** — `warehouses.tsx`, `dashboard.tsx`, `reports.tsx` changed from `display_currency` to `base_currency` for price formatting; IQD prices now always show in IQD even when `display_currency = "USD"`; `src/components/money.tsx` added as reusable `<Money>` component
- [x] **Company→Purchases filter** — purchases route now accepts `?company=<id>` search param; when active, shows a removable filter badge with company name; clear button navigates to unfiltered view; `filteredBy` i18n key added to all 3 locales
- [x] **User email edit** — `EditUserDialog` now shows email field (OWNER-only); `updateUserProfile` handler calls `admin.auth.admin.updateUserById` for email changes; `listUsers` merges emails from `auth.users` via admin API; `emailOptional` i18n key added
- [x] **Dialog scroll** — large dialogs (EmployeeDialog, ActionDialog, PurchaseDialog) now have `max-h-[90vh] overflow-y-auto` to prevent content overflow on small viewports
- [x] **Chart types** — profit comparison chart in reports changed from LineChart to AreaChart with gradient fills (multiple series comparison); other chart types already appropriate

---

## In progress / partial

- [ ] **Backup restore UI** — manual restore documented (download `.ndjson.gz` → decompress → `psql`) but no in-app restore flow.

---

## Planned / not started

- [ ] **Mobile-responsive layout** — sidebar collapses on small screens; data tables need horizontal scroll treatment on mobile.
- [ ] **Sales invoice PDF** — export a printable sale summary.
- [ ] **Employee payroll summary** — aggregate monthly actions (bonus/punishment/absent/overtime) into a net pay calculation.
- [ ] **Cloudflare R2 direct uploads** — product/employee images currently go to Supabase Storage; for the CF Workers deployment path they should upload direct to R2.
- [ ] **End-to-end tests** — no test suite yet; Playwright or Bun test + Supabase local emulator.

---

## Known gotchas

- **`supabase/volumes/db/data/` is a bind-mount** — `docker compose down --volumes` does NOT remove it. To fully wipe the DB you must also delete this directory before bringing containers back up.
- **CRLF on Windows** — files mounted into Linux containers (`kong-entrypoint.sh`, `pooler.exs`, `vector.yml`) must have LF line endings. Editing them in Windows Notepad breaks them.
- **`gen:types` needs DB running** — `bun run gen:types` connects to `localhost:5432`; the Supabase dev stack must be up first.
- **`SUPABASE_URL` differs by context** — dev app (outside Docker): `http://localhost:8000`; prod app container (inside Docker): `http://kong:8000`. The setup scripts handle this automatically.
