# Development guide

> See also: [Architecture](architecture.md) · [Deployment](deployment.md)

## Prerequisites

| Tool | Min version | Install |
|------|------------|---------|
| **Bun** | 1.2 | `curl -fsSL https://bun.sh/install \| bash` |
| **Docker Desktop** | latest | https://docs.docker.com/get-docker/ |
| **Git** | any | system package manager |

No Supabase CLI needed locally — all DB operations go through `docker exec`.

---

## First-time setup (any machine)

### Recommended: use the setup script

The setup script handles everything (deps, `.env` generation with real JWT keys,
Docker stack, migrations) in one command:

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1 dev
```

**Linux / macOS (bash):**
```bash
bash scripts/setup.sh dev
```

Then start the dev server:
```bash
bun run dev   # → http://localhost:3000
```

---

### Manual steps (if you need fine-grained control)

### 1. Clone and install

```bash
git clone <repo-url> factory-management-system
cd factory-management-system
bun install
```

### 2. Create `.env`

```bash
cp .env.example .env
```

Generate real JWT keys (run once, paste output into `.env`):

```bash
bun -e "
  const c = require('crypto');
  const secret = c.randomBytes(48).toString('base64url');
  const now = Math.floor(Date.now()/1000), exp = now + 10*365*24*3600;
  const h = { alg:'HS256', typ:'JWT' };
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sign = (p) => { const d=b(h)+'.'+b(p); return d+'.'+c.createHmac('sha256',secret).update(d).digest('base64url'); };
  console.log('JWT_SECRET='+secret);
  console.log('ANON_KEY='+sign({role:'anon',iss:'supabase',iat:now,exp}));
  console.log('SERVICE_ROLE_KEY='+sign({role:'service_role',iss:'supabase',iat:now,exp}));
"
```

Fill in `.env` — the three `*_ANON_KEY` and `*_SERVICE_ROLE_KEY` entries must
all contain the same literal value (shell `${VAR}` expansion is not supported
in all runtimes, so duplicates are required):

```env
JWT_SECRET=<from generator>
ANON_KEY=<from generator>
SERVICE_ROLE_KEY=<from generator>
POSTGRES_PASSWORD=<strong random string>
DASHBOARD_PASSWORD=<any password>
PUBLIC_SUPABASE_ANON_KEY=<same as ANON_KEY>
VITE_SUPABASE_ANON_KEY=<same as ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<same as SERVICE_ROLE_KEY>
```

> **Important for dev:** `SUPABASE_URL` in `.env` should be `http://localhost:8000`
> (the app runs outside Docker during dev). The `prod` setup script sets it to
> `http://kong:8000` for the in-Docker app container — do not use that value for dev.

### 3. Start Supabase

```bash
bun run supabase:up
# Wait ~30–60 s then verify all 13 containers are healthy:
docker ps --format "{{.Names}}: {{.Status}}"
```

> **Fresh DB only:** if you ever wipe and reinitialise the database, you must also
> delete `supabase/volumes/db/data/` — that bind-mount is NOT removed by
> `docker compose down --volumes`.

### 4. Apply migrations

The migration scripts are **tracked** — they record each applied file in `public.schema_migrations` and skip it on subsequent runs, so re-running is always safe.

**Windows:**
```powershell
bun run supabase:migrate:all
```

**Linux / macOS:**
```bash
bun run supabase:migrate:all:sh
```

Migrations applied in filename order:

| File | Contents |
|------|----------|
| `20260425000001_initial_schema.sql` | All tables, enums, triggers |
| `20260425000002_rls_policies.sql` | RLS + helper functions (`has_permission`, `is_owner`, etc.) |
| `20260425000003_storage_and_cron.sql` | Storage buckets + pg_cron/pg_net setup |
| `20260425000004_permissions.sql` | `permission_catalog` + `user_permissions` |
| `20260425000005_security_hardening.sql` | `search_path` hardening + tighter storage/dollar policies |
| `20260425000006_backup_credentials.sql` | R2 credential columns on `site_settings` |
| `20260425000007_restore_sequences.sql` | Sequence repair helper after data restore |
| `20260503000008_fix_backup_default.sql` | Fix backup default schedule |
| `20260503000009_warehouse_system.sql` | Warehouse tables, `warehouse_products`, `warehouse_users` |
| `20260503000010_warehouse_permissions.sql` | Warehouse RLS + permission rows |
| `20260503000011_safe_soft_delete.sql` | `soft_delete_sale`, `restore_sale`, `hard_delete_sale` RPCs |
| `20260503000012_trash_permissions.sql` | `trash:manage` permission |
| `20260503000013_categories_and_history.sql` | Product categories, sale/purchase history views |
| `20260508000014_fix_storage_policies.sql` | Tighten storage bucket policies |
| `20260508000015_employee_terminate_action.sql` | `TERMINATE` action type + soft-delete on terminate |
| `20260508000016_profile_phone.sql` | `phone` column on `profiles` |
| `20260508000017_fix_employees_storage_policy.sql` | Employee avatar storage policy fix |
| `20260508000018_purchase_inventory.sql` | `company_purchases` inventory + `adjust_warehouse_qty` RPC |
| `20260509000019_create_purchase_rpc.sql` | Atomic `create_purchase` SECURITY DEFINER RPC |
| `20260510000020_warehouse_adjust_audit.sql` | `warehouse_adjustments` log table + `adjust_warehouse_qty_audited` RPC |
| `20260510000021_purchase_is_finished.sql` | `company_purchases.is_finished` column + backfill |
| `20260510000022_create_sale_rpc.sql` | Atomic `create_sale` SECURITY DEFINER RPC |

### 5. Start the dev server

```bash
bun run dev
# → http://localhost:3000
```

The app redirects to `/setup` on first run. Complete the wizard to configure
branding and create the owner account.

---

## Daily workflow

```bash
bun run supabase:up    # if Supabase isn't already running
bun run dev            # http://localhost:3000
```

---

## All scripts

```bash
# App
bun run dev              # Vite dev server with HMR
bun run build            # production bundle → .output/
bun run start            # run the built bundle
bun run typecheck        # tsc --noEmit
bun run lint             # eslint
bun run format           # prettier

# Supabase
bun run supabase:up               # docker compose up -d (dev stack)
bun run supabase:down             # stop containers
bun run supabase:prod:up          # start with prod overlay (Caddy + app container)
bun run supabase:prod:down        # stop prod stack
bun run supabase:migrate:all      # apply pending migrations, tracked (Windows)
bun run supabase:migrate:all:sh   # apply pending migrations, tracked (Linux/macOS)
bun run supabase:migrate          # pipe a single SQL file: < migration.sql
bun run supabase:shell            # interactive psql inside the DB container

# Database maintenance
bun db:reset                      # wipe data + auth; returns to first-run wizard
bun db:fix-passwords              # reset internal role passwords after POSTGRES_PASSWORD change

# Types & deploy
bun run gen:types        # regenerate src/lib/database.types.ts from live DB
bun run gen:types:win    # same, via PowerShell (uses postgres-meta REST API)
bun run deploy:cf        # wrangler deploy to Cloudflare Workers
```

---

## Adding a domain module

Every module is one route file in `src/routes/app/`. Pattern:

**1. Migration** (`supabase/migrations/<timestamp>_<name>.sql`)
- `deleted_at timestamptz` for soft delete
- `dollar numeric(12,2)` for transactional tables (rate snapshot — never remove)
- Partial unique index `where deleted_at is null` for active-row uniqueness
- `(resource, action, label)` rows in `permission_catalog`

**2. RLS policies** — use `has_permission('<resource>', '<action>')` helper;
never re-implement. Add SELECT + INSERT + UPDATE + DELETE policies.

**3. Route** (`src/routes/app/<resource>.tsx`)
- All DB access via `createServerFn` — never call Supabase from components
- Soft delete: `.update({ deleted_at: new Date().toISOString() })`
- List: always `.is('deleted_at', null)`

**4. UI** — `<DataTable>` for list; `<Dialog>` + `useForm` for CRUD dialogs;
`useMutation` → `toast` → `qc.invalidateQueries`.

**5. Sidebar** — add to `NAV` array in [`src/routes/app/route.tsx`](../src/routes/app/route.tsx).

---

## Debugging RLS

```sql
-- bun run supabase:shell
set role authenticated;
set request.jwt.claim.sub to '<user-uuid>';
select * from public.<table>;
reset role;
```

If 0 rows: check `enable row level security` was run; verify a SELECT policy
exists. UPDATE/DELETE silently skip rows with no matching SELECT policy.

---

## Regenerating TypeScript types

After any schema-changing migration:

```bash
bun run gen:types
# writes src/lib/database.types.ts
```

The pooler exposes `localhost:5432` in dev — no extra configuration needed.

---

## Testing the backup edge function

```bash
SERVICE_ROLE_KEY=$(grep ^SUPABASE_SERVICE_ROLE_KEY .env | cut -d= -f2)
curl -X POST http://localhost:8000/functions/v1/backup \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"manual"}'

# Confirm:
bun run supabase:shell -c \
  "select id, status, started_at from public.backup_runs order by id desc limit 3"
```

---

## Database maintenance

### Resetting the dev DB

```bash
bun db:reset
```

Pipes `supabase/reset.sql` through `docker exec` into the running `supabase-db` container. Truncates every public-schema data table, resets `site_settings` to first-run defaults, and clears `auth.users`/sessions/refresh tokens/MFA factors. Open `http://localhost:3000` after running and you'll land on `/setup` to recreate the OWNER account.

The `/app` route's auth-failure path (`src/routes/app/route.tsx`) calls `invalidateSettingsCache()` so the in-memory `_settings` cache from `__root.tsx` doesn't survive a reset.

### Fixing role password drift

```bash
bun db:fix-passwords
```

When the DB volume was initialized with one `POSTGRES_PASSWORD` and `.env` was later changed to a different value, every internal Supabase role (`authenticator`, `supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin`, `supabase_functions_admin`, `pgbouncer`) keeps the original password — PostgREST and friends fail with `password authentication failed for user "authenticator"`.

`scripts/fix-passwords.ps1`:

1. Reads the current `POSTGRES_PASSWORD` from `.env`.
2. Verifies `supabase-db` is running.
3. Connects as `supabase_admin` via the `127.0.0.1` trust rule in `pg_hba.conf` (no password needed for that path).
4. Runs `ALTER USER ... WITH PASSWORD '...'` for each internal role.

After running, restart the dependent containers (`bun supabase:down && bun supabase:up`) so they pick up the new credentials.

### Migration 0021 — `company_purchases.is_finished` backfill

Migration `20260510000021_purchase_is_finished.sql` adds the `is_finished` column to `company_purchases` (mirrors `sales.is_finished`) and backfills existing rows: every CASH purchase and every LOAN purchase with `total_remaining = 0` is set to finished. The migration is idempotent (`ADD COLUMN IF NOT EXISTS` + a single UPDATE filter), so re-applying it is safe.

It also re-issues the `create_purchase` RPC so newly-created CASH purchases are finished immediately.

---

## CI/CD overview

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| [`ci.yml`](../.github/workflows/ci.yml) | push / PR to `main` | TypeScript check, build, SQL migration smoke-test |
| [`release.yml`](../.github/workflows/release.yml) | push `v*` tag | Build + push Docker image to ghcr.io; optional Cloudflare deploy |

See [deployment.md](deployment.md) for production deployment details.
