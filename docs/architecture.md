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
│   │       ├── employees.tsx            # CRUD + actions (bonus/punishment/absent/overtime)
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
│   │   ├── 20260425000006_backup_credentials.sql # r2_* columns on site_settings
│   │   └── 20260425000007_restore_sequences.sql  # sequence repair after restore
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

ADMIN  ─► created by OWNER/ADMIN
         · full data access EXCEPT backup config
         · grants/revokes USER permissions

USER   ─► default role on signup (after the first user)
         · access only via explicit (resource, action) grants in user_permissions
         · resources: customers, products, sales, employees, expenses, companies,
                      purchases, dollar, reports, settings, backups
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
