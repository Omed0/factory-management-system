# Architecture

> See also: [Development](development.md) · [Deployment](deployment.md)

## High-level

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              Browser (RTL/LTR)                              │
│              TanStack Start client · TanStack Query · shadcn               │
└──────────────┬─────────────────────────────────────────────┬───────────────┘
               │ SSR + server fns                            │ direct (storage uploads)
               ▼                                             ▼
┌────────────────────────────────┐                ┌────────────────────────┐
│  TanStack Start (node-server)  │                │   Supabase Storage     │
│  app.config.ts: preset switch  │   service-     │  branding · products   │
│  routes: /setup /login /app/*  │   role admin   │  employees · backups   │
│  Edge Function caller          │ ─────────────► │                        │
└────────────────┬───────────────┘                └─────────┬──────────────┘
                 │ @supabase/ssr (RLS as user)              │
                 ▼                                          │
        ┌──────────────────────┐                            │
        │  Kong (api gateway)  │                            │
        └──┬─────┬─────┬───┬──┘                             │
           │     │     │   │                                │
           ▼     ▼     ▼   ▼                                │
        ┌────┐ ┌────┐ ┌──────┐ ┌───────────┐                │
        │auth│ │rest│ │storg │ │realtime   │                │
        └────┘ └────┘ └──────┘ └───────────┘                │
            \    │    /                                     │
             ▼   ▼   ▼                                      │
        ┌──────────────────┐                                │
        │  Postgres 15     │                                │
        │  RLS · pg_cron   │ ────► invokes /functions/v1/backup
        │  pg_net · vault  │                                │
        └────────┬─────────┘                                │
                 │ pg_dump → S3 client                      │
                 ▼                                          │
        ┌────────────────────┐  fallback                    │
        │  Cloudflare R2     │ ◄────────────────────────────┘
        └────────────────────┘
```

## Code layout

```
.                                        # repo root = project root
├── vite.config.ts                       # TanStack Start + Vite config; DEPLOY_TARGET=cloudflare switches preset
├── components.json                      # shadcn CLI config (css → src/styles/app.css)
├── package.json                         # bun workspace, scripts
├── tsconfig.json                        # baseUrl=. paths ~/* → src/*
├── Dockerfile                           # multi-stage bun build; non-root; healthcheck
├── src/                                 # TanStack Start appDirectory
│   ├── routes/                          # File-based routing
│   │   ├── __root.tsx                   # html/head, branding tokens, providers; settings cache
│   │   ├── index.tsx                    # gate → /setup | /login | /app/dashboard
│   │   ├── setup.tsx                    # First-run wizard (creates OWNER + site_settings)
│   │   ├── login.tsx                    # Supabase Auth password sign-in
│   │   ├── healthz.ts                   # Liveness/readiness probe
│   │   └── app/
│   │       ├── route.tsx                # Auth-protected layout (sidebar + nav)
│   │       ├── dashboard.tsx            # KPI cards
│   │       ├── customers.tsx            # CRUD module
│   │       ├── products.tsx             # CRUD + image upload
│   │       ├── employees.tsx            # CRUD + actions (bonus/punishment/absent/overtime/TERMINATE)
│   │       ├── sales.tsx                # Multi-line sale + loan-payment collection
│   │       ├── companies.tsx            # Supplier CRUD
│   │       ├── purchases.tsx            # Company purchases + payments
│   │       ├── expenses.tsx             # CRUD
│   │       ├── dollar.tsx               # USD/IQD rate + history
│   │       ├── reports.tsx              # Aggregations by month
│   │       └── settings/
│   │           ├── route.tsx            # Tab layout
│   │           ├── index.tsx            # Default redirect
│   │           ├── branding.tsx         # site_settings full editor + logo upload
│   │           ├── users.tsx            # User mgmt + permission grid (admin)
│   │           └── backups.tsx          # History + manual + config (OWNER)
│   ├── lib/
│   │   ├── supabase.server.ts           # getSupabaseServer() RLS-on client · getSupabaseAdmin() service-role
│   │   ├── supabase.browser.ts          # getSupabaseBrowser() anon client (browser only)
│   │   ├── site-settings.ts             # SSR loader for branding + invalidateSettingsCache()
│   │   ├── auth.ts                      # requireUser, loadPermissions, can()
│   │   ├── utils.ts                     # cn, formatNumber, formatCurrency
│   │   └── database.types.ts            # generated — bun run gen:types
│   ├── components/
│   │   ├── ui/                          # shadcn primitives (bunx shadcn@latest add)
│   │   ├── data-table.tsx               # TanStack Table v8 wrapper
│   │   ├── permission-grid.tsx          # (resource × action) checkbox matrix
│   │   └── form-fields.tsx              # TextField, SelectField, TextAreaField, ColorField
│   └── styles/app.css                   # Tailwind v4 @theme tokens (CSS-first)
├── supabase/
│   ├── bootstrap.sh                     # Vendor official supabase/docker tree
│   ├── docker-compose.yml               # (vendored — do not edit)
│   ├── docker-compose.prod.yml          # OUR overlay: Caddy+TLS, app, hardening
│   ├── Caddyfile                        # TLS, HSTS, Studio basic-auth
│   ├── migrations/
│   │   ├── 20260425000001_initial_schema.sql   # tables, enums, triggers
│   │   ├── 20260425000002_rls_policies.sql     # RLS + helper functions
│   │   ├── 20260425000003_storage_and_cron.sql # storage buckets + pg_cron
│   │   ├── 20260425000004_permissions.sql      # permission_catalog + user_permissions
│   │   ├── 20260425000005_security_hardening.sql # search_path hardening + tighter policies
│   │   ├── 20260425000006_backup_credentials.sql   # r2_* columns on site_settings
│   │   ├── 20260425000007_restore_sequences.sql   # sequence repair after restore
│   │   ├── 20260425000008_fix_backup_default.sql  # backup_provider default + employees storage policy
│   │   ├── 20260425000009_warehouse_system.sql    # warehouses, warehouse_users, warehouse_products + RPCs
│   │   ├── 20260425000010_warehouse_permissions.sql # 5 warehouse/inventory permission_catalog entries
│   │   ├── 20260425000011_safe_soft_delete.sql    # SECURITY DEFINER RPCs for transactional soft-delete/restore
│   │   ├── 20260425000012_trash_permissions.sql   # trash:manage permission_catalog entry
│   │   ├── 20260425000013_categories_and_history.sql # expenses.category + dollar_history table
│   │   ├── 20260508000014_fix_storage_policies.sql # products/branding INSERT → auth.uid() IS NOT NULL
│   │   ├── 20260508000015_employee_terminate_action.sql # ADD VALUE 'TERMINATE' to employee_action_type
│   │   └── 20260508000016_profile_phone.sql       # ALTER TABLE profiles ADD COLUMN phone text
│   └── functions/backup/index.ts        # Edge: logical export → R2/Supabase → rotate
├── deploy/
│   ├── vps/harden.sh                    # UFW/fail2ban/Docker/swap/healthcheck cron
│   └── cloudflare/wrangler.toml
├── docs/                                # architecture.md · development.md · deployment.md
├── .env.example
└── .github/
    ├── workflows/ci.yml                 # typecheck + build + SQL migration smoke-test
    └── workflows/release.yml            # Docker image → ghcr.io; optional CF deploy
```

## Supabase client split

| Export | File | Auth context | When to use |
|--------|------|-------------|-------------|
| `getSupabaseServer()` | `supabase.server.ts` | Reads session cookie (RLS **on**) | All user-initiated server fns |
| `getSupabaseAdmin()` | `supabase.server.ts` | Service-role key (RLS **bypassed**) | Trusted server-only ops (setup, backup) |
| `getSupabaseBrowser()` | `supabase.browser.ts` | Anon key (RLS **on**) | Client-side storage uploads |

Never import `supabase.server.ts` from a `.tsx` component — Vite will block it at
build time. Server fn files use the `.server.ts` naming convention.

## Authorization model

```
OWNER  ─► singleton (DB-enforced unique partial index + trigger)
         · transfer_ownership() RPC swaps roles atomically
         · only OWNER may change backup_provider/keep_n/cron
         · can edit any user's profile (name, phone, email, password)

ADMIN  ─► created by OWNER/ADMIN
         · full data access EXCEPT backup config
         · grants/revokes USER permissions
         · can edit USER-role profiles; cannot edit OWNER's profile

USER   ─► default role on signup (after the first user)
         · access only via explicit (resource, action) grants in user_permissions
         · resources: customers, products, sales, employees, expenses, companies,
                      purchases, dollar, reports, settings, backups

profiles table columns: id, email, name, role, phone (optional), deleted_at
```

`has_permission(resource, action)` is the helper used in every RLS policy. The
UI mirrors this at render time via `loadPermissions()` to gate menu items and
buttons (RLS is the actual security boundary; UI gating is purely UX).

## Environment variables

| Variable | Where used | Notes |
|----------|-----------|-------|
| `JWT_SECRET` | Supabase Kong/Auth | Must match the secret used to sign `ANON_KEY` and `SERVICE_ROLE_KEY` |
| `ANON_KEY` | Supabase internal | Same value as `VITE_SUPABASE_ANON_KEY` / `PUBLIC_SUPABASE_ANON_KEY` |
| `SERVICE_ROLE_KEY` | Supabase internal | Same value as `SUPABASE_SERVICE_ROLE_KEY` |
| `POSTGRES_PASSWORD` | Supabase DB | Change before first `docker compose up`; cannot change after DB is initialized |
| `PUBLIC_SUPABASE_URL` | App server | e.g. `http://localhost:8000` in dev, `https://api.your-domain.com` in prod |
| `VITE_SUPABASE_ANON_KEY` | Browser bundle | Inlined by Vite at build time — must equal `ANON_KEY` |
| `PUBLIC_SUPABASE_ANON_KEY` | SSR server | Read at runtime by the server — must equal `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | SSR server | Used by `getSupabaseAdmin()` — never expose to browser |

Shell `${VAR}` expansion is not reliable across all runtimes. Write literal
values for all six key variables in `.env` — do not use references.

## Dynamic branding

`site_settings` (singleton row, id=1) holds factory name, logo URL, primary/accent
colors, language, direction, currency, etc. The root route (`__root.tsx`) caches
settings at the module level (`_settings`) and invalidates the cache after
`/setup` and branding saves via `invalidateSettingsCache()`. Branding changes are
visible on the next page load with **no rebuild**.

`setup_completed` gates the first-run wizard: while false, every route except
`/setup` redirects to it.

## Backup pipeline

1. `pg_cron` job `fms-nightly-backup` runs at `site_settings.backup_cron`.
2. Job invokes `public.invoke_backup_fn()` which uses `pg_net` to POST to the
   `backup` Edge Function with `{kind:'scheduled'}`.
3. Edge Function reads `site_settings.backup_provider` + `backup_keep_n`,
   dumps every public table to gzipped NDJSON, uploads to R2 or Supabase Storage,
   inserts a `backup_runs` row, and rotates older backups.
4. When `site_settings.backup_cron` is updated, a trigger reschedules the cron
   job — no manual `cron.unschedule` needed.
5. Manual backups: from `/app/settings/backups` the UI invokes the same Edge
   Function with `{kind:'manual'}`.

## Money-equality invariants and the trash/restore flow

Every transactional entity (`sales`, `company_purchases`, `expenses`, `employee_actions`) snapshots the USD rate in a `dollar` column at creation time — do not normalize this away.

**Soft-delete safety for sales:** `createSale` calls `adjust_warehouse_qty(-qty)` for each item. To keep inventory consistent, any delete of a sale must reverse this (i.e., call `adjust_warehouse_qty(+qty)`). This is done inside the `soft_delete_sale` SECURITY DEFINER RPC (migration 0011). Never soft-delete a sale with a plain `UPDATE SET deleted_at`.

**Restore safety:** `restore_sale` re-deducts inventory using `adjust_warehouse_qty(-qty)` with `GREATEST(0, qty + delta)` guarding against negative stock. If a product was hard-deleted or warehouse removed, those items are silently skipped and a UI warning is shown.

**Hard-delete safety:** If a sale is still active (not soft-deleted) when hard-deleted, the `hard_delete_sale` RPC reverses inventory first, then issues a `DELETE` that cascades to `sale_items` and `paid_loans`.

**Audit query rule:** Any aggregation over child financial tables (`paid_loans`, `purchase_payments`, `sale_items`) must use a PostgREST `!inner` embed-join to the parent and filter `parent.deleted_at IS NULL`. A plain LEFT JOIN silently includes children of soft-deleted parents, inflating totals. See the `runAudit` server function in `src/routes/app/reports.tsx` for the correct pattern.

## Money display: snapshot vs. current rate

The `dollar` snapshot column captures the IQD/USD rate at fill-time. It feeds two display modes:

- **Per-record rendering** (list cells, detail dialogs): use `formatRecordMoney(amount, currency, row.dollar, currentDollar)` from `~/lib/currency`. Historical USD figures stay stable when the current rate changes.
- **Aggregate rendering** (dashboard KPIs, reports summaries, warehouse total inventory value): sum IQD then convert with the current rate via `formatMoney(sum, currency, currentDollar)`. We trade historical accuracy for "today's value of all balances" — this is what users typically expect from a KPI card. Document the choice in the call site when adding new aggregations.

A row with `dollar = 0` or `null` falls through `formatRecordMoney` to the `currentDollar` fallback (defensive, for legacy rows created before the snapshot existed).

## Service startup order (Docker)

The Supabase self-hosted stack chains `depends_on: condition: service_healthy` blocks. Slow-starting services pull every downstream service into their critical path. Specifically: `analytics` (Logflare) takes ~50 s on a cold start (10 retries × 5 s health-check). `studio` waits on `analytics`; if `kong` (the API gateway the app talks to on port 8000) waits on `studio`, every fresh `bun supabase:up` blocks the app for ~50 s.

Mitigation: `kong`'s `depends_on` is set to `db` and `auth` only. Kong uses a declarative config (`volumes/api/kong.yml`) and only needs the DB and the auth service to route requests — Studio is a developer console, not part of the data path. This change cuts the cold-start gating chain from `db → analytics → studio → kong` down to `db → auth → kong`.

If you ever add a new gateway-fronted service, depend on the minimum it actually needs at request-handling time, not the convenient grab-all of `studio` or `analytics`.

## Quantity model: grains, cartons, unit_type

All stock-bearing tables (`warehouse_products.qty`, `sale_items.quantity`, `company_purchases.quantity`) store a single integer of "grains" — the smallest indivisible unit. Cartons are a display/input convenience: a product with `grains_per_carton = 20` means each carton holds 20 grains, so 5 cartons = 100 grains. Products without `grains_per_carton` (or with 0) have no carton concept and use `unit_type` (`METER` / `PIECE`) for labeling.

**Single-source-of-truth rule:** `<QtyInput>` (`src/components/qty-input.tsx`) is the only place in the codebase that converts `(cartons, loose_grains)` into the single grains integer. It accepts the controlled `value` (always grains) and emits grains via `onChange`. Internally:

- When `grainsPerCarton > 0`: renders two side-by-side fields. `total = cartons × gpc + loose`.
- When `grainsPerCarton` is null / 0: single field labelled by `unit_type` (m / pcs).
- `allowNegative` mode adds a `[+ Add | − Remove]` selector for warehouse adjustments.

Display goes through `qtyDisplay(grains, gpc, unit_type, t)` (`src/lib/inventory.ts`). When called with no `t`, it returns an ASCII fallback (`5c+3g`) that's safe to drop into print HTML.

## Warehouse adjust audit

Manual stock adjustments are a privileged operation — they can move inventory without a sale or purchase paper trail. To prevent abuse the system uses two RPCs and a log:

- `adjust_warehouse_qty(wh, pid, delta)` — the low-level one. Floors at 0. SECURITY DEFINER. Now rejects USER-role calls into warehouses the user isn't assigned to. All internal callers (sales/purchases create + soft-delete RPCs) go through this directly.
- `adjust_warehouse_qty_audited(wh, pid, delta, reason)` — the wrapper used by the UI. Requires a non-empty reason, OWNER+ADMIN only, calls the low-level RPC, then writes a row to `public.warehouse_adjustments` with `adjusted_by = auth.uid()` and `adjusted_at = now()`. The `warehouse_adjustments` table has SELECT RLS for OWNER+ADMIN only; no INSERT/UPDATE/DELETE policies — writes go through the SECURITY DEFINER RPC.
- The `inventory:write` permission was removed from the USER-role essentials (migration 0020). Even if a USER somehow gets the permission re-granted, the RPC's role check still rejects them.

The warehouse detail dialog has an "Adjustment log" tab (visible to OWNER+ADMIN only) that lists the last 20 rows from `warehouse_adjustments` for that warehouse with date, product, signed delta, reason, and adjuster name.
