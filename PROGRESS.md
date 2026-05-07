# Progress

Last updated: 2026-05-07 (Phases A–F + G–K + Security hardening completed)

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

### Database (13 migrations)
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
- [x] Employees (`/app/employees`) — CRUD + actions (bonus / punishment / absent / overtime), dollar snapshot
- [x] Sales (`/app/sales`) — multi-line sale entry, cash/loan, loan-payment collection, dollar snapshot; warehouse selector (inventory auto-decremented on create); `total_amount` recalculated server-side
- [x] Companies (`/app/companies`) — supplier CRUD
- [x] Purchases (`/app/purchases`) — supplier purchases + cash/installment payments, dollar snapshot; warehouse selector for association
- [x] Expenses (`/app/expenses`) — CRUD, dollar snapshot, category field (free-text for expense breakdown chart)
- [x] Dollar rate (`/app/dollar`) — current IQD/USD rate + history
- [x] Reports (`/app/reports`) — monthly aggregations + bar chart; profit view; **Financial Audit** view (full cash-flow equality, prorated payroll, net balance); quick-range buttons; analytics section: top products + top customers (horizontal bar), expense breakdown (pie), dollar rate history (line chart)
- [x] Warehouses (`/app/warehouses`) — CRUD; user assignment; per-product inventory with carton/grain display; manual stock adjustment (nav item always visible via ESSENTIAL_PERMISSIONS fallback)
- [x] Dashboard (`/app/dashboard`) — KPI cards (including outstanding payables); 6-month area chart; recent activity feed (sales/purchases/expenses merged); low-stock alerts; top 5 products today
- [x] Trash manager (`/app/settings/trash`) — tabs for all 9 entity types; restore (with inventory re-adjustment for sales) and hard-delete (permanent, with confirm); warehouse stock warning on sale restore
- [x] Settings — branding editor (factory name, colors, currency dropdowns for base + display)
- [x] Settings — user management + permission grid; OWNER-only ADMIN promotion; "Edit my profile" (name + password)
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
