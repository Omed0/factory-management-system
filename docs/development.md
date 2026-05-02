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

```bash
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  bun run supabase:migrate < "$f"
done
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
bun run supabase:up          # docker compose up -d (dev stack)
bun run supabase:down        # stop containers
bun run supabase:prod:up     # start with prod overlay (Caddy + app container)
bun run supabase:prod:down   # stop prod stack
bun run supabase:migrate     # pipe a SQL file: < migration.sql
bun run supabase:shell       # interactive psql inside the DB container

# Types & deploy
bun run gen:types        # regenerate src/lib/database.types.ts from live DB
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

## CI/CD overview

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| [`ci.yml`](../.github/workflows/ci.yml) | push / PR to `main` | TypeScript check, build, SQL migration smoke-test |
| [`release.yml`](../.github/workflows/release.yml) | push `v*` tag | Build + push Docker image to ghcr.io; optional Cloudflare deploy |

See [deployment.md](deployment.md) for production deployment details.
