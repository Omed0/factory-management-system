# Factory Management System

Kurdish-language (Sorani, RTL) factory/sales management app for a real business in Iraq.

**Stack**
- **TanStack Start** (React 19, file-based router, server functions, SSR)
- **Self-hosted Supabase** via Docker (Postgres 15, Auth, Storage, Realtime, Edge Functions, pg_cron, pg_net)
- **Tailwind 4** (CSS-first `@theme`, runtime branding via CSS vars)
- **shadcn** (latest CLI) + **TanStack Form** + **TanStack Table v8**
- **Bun** — package manager and runtime
- **Cloudflare R2** for off-site backups (Supabase Storage as fallback)

## Layout

```
.
├── app.config.ts          # vinxi/TanStack Start config
├── components.json        # shadcn CLI config
├── package.json
├── tsconfig.json
├── Dockerfile
├── src/                   # TanStack Start appDirectory (routes + app code)
│   ├── routes/            # file-based routing (/setup /login /app/*)
│   ├── lib/               # supabase clients, auth, site-settings
│   ├── components/        # shadcn ui/ (CLI-installed) + app components
│   └── styles/            # Tailwind 4 entry
├── supabase/              # self-hosted Supabase stack
│   ├── bootstrap.sh       # vendor supabase/docker tree (run once)
│   ├── docker-compose.yml         # vendored (do not edit)
│   ├── docker-compose.prod.yml    # OUR overlay (Caddy+TLS, app, hardening)
│   ├── Caddyfile
│   ├── migrations/        # schema, RLS, storage+cron, permissions
│   └── functions/backup/  # Edge Function: pg_dump → R2/Supabase → rotate
├── deploy/
│   ├── vps/harden.sh      # one-shot Debian/Ubuntu VPS hardening
│   └── cloudflare/wrangler.toml
└── docs/                  # architecture, development, deployment guides
```

## First-time setup (local dev)

All commands from **repo root**:

```bash
cp .env.example .env       # fill in JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, etc.

# 1) Start Supabase
cd supabase && ./bootstrap.sh && docker compose --env-file ../.env up -d && cd ..
supabase db push           # apply migrations

# 2) Install + run app
bun install
bunx shadcn@latest init    # reads components.json at root
bunx shadcn@latest add button input label card dialog select table dropdown-menu tabs form alert-dialog badge tooltip toast
bun run dev                # → http://localhost:3000
```

First page load redirects to `/setup` — fill in factory name, branding, and
OWNER credentials. Subsequent loads go to `/login` → `/app/dashboard`.

## Deploy → VPS

```bash
# On a fresh Debian 12 / Ubuntu 22.04 VPS, as root:
git clone <this-repo> /opt/fms
NEW_USER=fms SSH_PUBKEY="ssh-ed25519 AAAA…" \
APP_DOMAIN=app.example.com ADMIN_EMAIL=you@example.com \
bash /opt/fms/deploy/vps/harden.sh

# As the new user:
cd /opt/fms && cp .env.example .env  # fill in
cd supabase && ./bootstrap.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file ../.env up -d
supabase db push
```

`harden.sh`: UFW (22/80/443), fail2ban, key-only SSH, unattended-upgrades,
Docker, 2 GB swap, `*/5` cron health-check emailing on container failure.

## Deploy → Cloudflare Workers

Supabase stays on a VPS; only the app ships to Workers:

```bash
DEPLOY_TARGET=cloudflare bun run build
wrangler secret put PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler deploy --config deploy/cloudflare/wrangler.toml
```

## Backups

Driven by `site_settings.backup_*` + `pg_cron`:

| Setting | Default | Meaning |
|---------|---------|---------|
| `backup_provider` | `supabase` | `r2` \| `supabase` \| `local` \| `vps` |
| `backup_keep_n` | `2` | Rotation — keep N latest, drop older |
| `backup_cron` | `0 3 * * *` | Cron expression; changing it live-reschedules the job |

Manual backups and config are available at `/app/settings/backups` (OWNER only).

## Docs

- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Deployment](docs/deployment.md)
- [Progress](PROGRESS.md)
