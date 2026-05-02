# Factory Management System

A Kurdish-language (Sorani, RTL) factory and sales management system built for a real business in Iraq. Tracks sales, loans, customers, products, employees (with bonus/punishment/overtime actions), supplier purchases, expenses, and the IQD/USD exchange rate.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend / SSR | TanStack Start (React 19, file-based routing, server functions) |
| Database | Self-hosted Supabase — Postgres 15, Auth, Storage, Realtime, Edge Functions, pg_cron |
| Styling | Tailwind 4 (CSS-first `@theme`), shadcn components |
| Forms / Tables | TanStack Form · TanStack Table v8 · TanStack Query |
| Runtime | Bun |
| Deploy A | VPS — Docker Compose + Caddy (TLS) |
| Deploy B | Cloudflare Workers + self-hosted Supabase |
| Backups | Cloudflare R2 (primary) or Supabase Storage (fallback) |

---

## Quick start — development

**Windows (PowerShell):**
```powershell
git clone <repo-url> factory-management-system
cd factory-management-system
.\scripts\setup.ps1 dev
bun run dev
```

**Linux / macOS (bash):**
```bash
git clone <repo-url> factory-management-system
cd factory-management-system
bash scripts/setup.sh dev
bun run dev
```

The setup script installs dependencies, generates JWT keys, writes `.env`, starts the Supabase Docker stack, and applies all migrations. Then open **http://localhost:3000** — the first-run wizard will guide you through factory name, colors, and the owner account.

---

## Daily workflow

```bash
bun run supabase:up   # start Supabase (if not already running)
bun run dev           # http://localhost:3000
```

---

## Production deployment

### Path A — VPS (full stack)

```bash
# 1. On a fresh Debian/Ubuntu VPS:
bash /opt/fms/deploy/vps/harden.sh   # UFW, fail2ban, Docker, swap

# 2. Configure + start Supabase:
bash scripts/setup.sh prod           # Linux/macOS (or .\scripts\setup.ps1 prod on Windows)

# 3. Build and push the Docker image:
bash scripts/setup.sh deploy:vps
# then on the VPS:
docker compose -f supabase/docker-compose.prod.yml pull app
docker compose -f supabase/docker-compose.prod.yml up -d app
```

### Path B — Cloudflare Workers

```bash
# After prod setup (Supabase already running on VPS):
bash scripts/setup.sh deploy:cf      # Linux/macOS
.\scripts\setup.ps1 deploy-cf        # Windows
```

CI builds a Docker image on every `v*` tag push and optionally deploys to Cloudflare Workers when `DEPLOY_CLOUDFLARE=true` is set in repo variables.

---

## All scripts

```bash
# App
bun run dev              # Vite dev server with HMR — http://localhost:3000
bun run build            # production bundle → .output/
bun run start            # run the built bundle
bun run typecheck        # tsc --noEmit
bun run lint             # eslint
bun run format           # prettier

# Supabase
bun run supabase:up          # start dev stack (docker compose up -d)
bun run supabase:down        # stop containers
bun run supabase:prod:up     # start with Caddy + app prod overlay
bun run supabase:prod:down   # stop prod stack
bun run supabase:migrate     # pipe a SQL file: bun run supabase:migrate < file.sql
bun run supabase:shell       # interactive psql

# Types & deploy
bun run gen:types        # regenerate src/lib/database.types.ts from live DB
bun run deploy:cf        # wrangler deploy to Cloudflare Workers
bun run deploy:vps       # build + push Docker image to ghcr.io (bash)

# Setup scripts (full automation)
.\scripts\setup.ps1 [dev|prod|deploy-vps|deploy-cf]     # Windows
bash scripts/setup.sh   [dev|prod|deploy:vps|deploy:cf]  # Linux/macOS
```

---

## Project structure

```
.
├── vite.config.ts          # TanStack Start + Vite config (MUST be at root)
├── components.json         # shadcn CLI config (MUST be at root)
├── Dockerfile              # multi-stage bun build; non-root; healthcheck
├── src/
│   ├── routes/             # file-based routing
│   │   ├── __root.tsx      # branding tokens, providers, settings cache
│   │   ├── setup.tsx       # first-run wizard
│   │   ├── login.tsx       # password sign-in
│   │   ├── healthz.ts      # liveness probe
│   │   └── app/            # auth-protected layout + all modules
│   ├── lib/                # supabase clients, auth, utils, env schema
│   ├── components/         # shadcn ui/ + data-table, form-fields, permission-grid
│   └── styles/app.css      # Tailwind v4 @theme tokens
├── supabase/
│   ├── docker-compose.yml          # vendored upstream stack
│   ├── docker-compose.prod.yml     # our overlay: Caddy, app, hardening
│   ├── Caddyfile                   # TLS + HSTS + Studio basic-auth
│   ├── migrations/                 # 7 SQL migrations (0001-0007)
│   └── functions/backup/           # pg_dump Edge Function → R2/Storage
├── deploy/
│   ├── vps/harden.sh               # server hardening script
│   └── cloudflare/wrangler.toml    # CF Workers config + R2 bindings
├── scripts/
│   ├── setup.sh                    # bash setup (dev/prod/deploy:vps/deploy:cf)
│   └── setup.ps1                   # PowerShell setup (Windows)
├── docs/
│   ├── architecture.md
│   ├── development.md
│   └── deployment.md
└── .github/workflows/
    ├── ci.yml                      # typecheck + build + SQL smoke-test on push/PR
    └── release.yml                 # Docker image → ghcr.io + optional CF deploy on tag
```

---

## Key design decisions

- **Dynamic branding** — factory name, logo, colors, locale, currency all live in the `site_settings` DB row; no rebuild needed to retheme.
- **Dollar snapshot** — every transactional table records the IQD/USD rate at time-of-record in a `dollar` column; never remove it.
- **RLS everywhere** — all `public` schema tables use Postgres Row Level Security. Server functions use `getSupabaseServer()` (RLS on) or `getSupabaseAdmin()` (service-role, for trusted ops only).
- **Roles**: `OWNER` → `ADMIN` → `USER`. Permissions per resource/action stored in `user_permissions`; enforced by `has_permission()` in RLS and mirrored in the UI.
- **Soft delete** via `deleted_at`; active-row uniqueness via partial indexes.

## Docs

| Doc | Content |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | System diagram, code layout, auth model, env vars, backup pipeline |
| [docs/development.md](docs/development.md) | First-time setup, daily workflow, migrations, RLS debugging |
| [docs/deployment.md](docs/deployment.md) | VPS and Cloudflare deployment walkthroughs |
| [progress.md](progress.md) | Feature completion status and known gaps |
