# CLAUDE.md

Guidance for Claude (or any agent) working in this repo.

## What this app is

A Kurdish-language (Sorani, RTL) factory/sales management system used by a real business in Iraq. It tracks sales (cash and loan), customers, products, employees with bonus/punishment/absent/overtime actions, supplier purchases (cash/loan installments), expenses, and the IQD-USD exchange rate. **Every transactional table snapshots the USD rate at time-of-record** (the `dollar` column) — this is intentional and must be preserved.

## Stack

- **TanStack Start** (React 19, file-based router, server functions). No Next.js, no React Router.
- **Self-hosted Supabase** via Docker — Postgres 15, Auth (gotrue), Storage, Realtime, Edge Functions, pg_cron, pg_net. Stack is vendored from upstream via `supabase/bootstrap.sh`.
- **Tailwind 4** with CSS-first `@theme` config. Branding (`--color-primary`, `--color-accent`) is set at runtime from `site_settings`.
- **shadcn** (latest CLI for components) — never hand-author primitives; use `bunx shadcn@latest add` to pull from official sources.
- **TanStack Form** for every form. **TanStack Table v8** for every table. **TanStack Query** for client cache.
- **Cloudflare R2** for off-site backups (Supabase Storage as fallback).
- **Bun** as the package manager and runtime. Use bun-native APIs where they exist (`Bun.file`, `Bun.password`, `Bun.sql`, `Bun.s3`, etc.).

## Project layout

```
.                      ← repo root = project root (package.json, tsconfig.json, Dockerfile here)
├── vite.config.ts     ← TanStack Start + Vite config; DEPLOY_TARGET=cloudflare switches to CF preset (MUST be at root)
├── components.json    ← shadcn CLI config (MUST be at root)
├── src/               ← appDirectory — all app source lives here
│   ├── routes/        ← file-based routing
│   ├── lib/           ← supabase clients, auth, site-settings, utils
│   ├── components/    ← shadcn ui/ + app components
│   └── styles/        ← Tailwind 4 entry (app.css)
├── supabase/          ← self-hosted Supabase docker stack + migrations + edge fns
├── deploy/            ← VPS harden.sh + Cloudflare wrangler.toml
└── docs/              ← architecture, development, deployment guides
```

`~/*` path alias maps to `src/*`. All imports use `~/lib/...`, `~/components/...`, etc.

## Critical conventions

1. **Branding is dynamic.** `site_settings` is a singleton DB row driving factory name, logo, colors, locale, currency. The app **must not** require a rebuild to change branding. The root route loads it on every request and applies it via inline CSS variables before paint.
2. **First-run wizard.** If `site_settings.setup_completed` is `false`, every route except `/setup` redirects to `/setup`. The wizard creates the first OWNER user and persists settings in one server function.
3. **RLS is enforced everywhere in the `public` schema.** Use `getSupabaseServer()` for user-scoped queries (RLS on); use `getSupabaseAdmin()` only in trusted server code (service role bypasses RLS).
4. **Roles**: `OWNER` > `ADMIN` > `USER`. Helpers `current_role()`, `is_owner()`, `is_admin_or_owner()`, `is_authenticated_user()` defined in migration 0002 — use them in policies, never re-implement.
5. **Soft delete** uses `deleted_at`. Active-row uniqueness uses partial unique indexes (`... where deleted_at is null`).
6. **Backups** are config-driven via `site_settings.backup_*`. The cron schedule is rebuilt by trigger when `backup_cron` changes — don't hard-code schedules elsewhere.
7. **`dollar` snapshot pattern.** Don't normalize away the `dollar` column from sales / purchases / employee_actions / expenses / products — historical records must reflect the rate at time-of-record.
8. **Telegram is gone.** The legacy `telegramToken` model and `node-telegram-bot-api` integration are **not** part of this codebase and will not be added back.

## Docs

| Doc | What it covers |
|-----|---------------|
| [docs/architecture.md](docs/architecture.md) | System diagram, code layout, client split, auth model, env vars, backup pipeline |
| [docs/development.md](docs/development.md) | First-time setup, daily workflow, all scripts, adding a domain module, debugging RLS |
| [docs/deployment.md](docs/deployment.md) | VPS path (harden → bootstrap → prod up → migrate) and Cloudflare Workers path |
| [deploy/vps/harden.sh](deploy/vps/harden.sh) | UFW, fail2ban, Docker, swap, healthcheck cron |
| [deploy/cloudflare/wrangler.toml](deploy/cloudflare/wrangler.toml) | CF Worker config, R2 bindings, secrets |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | Typecheck + build + SQL migration smoke-test |
| [.github/workflows/release.yml](.github/workflows/release.yml) | Docker image → ghcr.io + optional CF deploy on tag |

## Package / CLI rule

**If any package, component, or file can be installed or downloaded via CLI — use the CLI; do NOT write it by hand.**

Examples:
- shadcn primitives → `bunx shadcn@latest add <component>`
- Supabase types → `bun run gen:types` (uses `node_modules/.bin/supabase` — no separate CLI install needed)
- Any npm package → `bun add <package>`

## Skills (live at `C:/Users/CS5/.agents/skills/`)

The user maintains a skills library outside this repo. When working on a topic below, **read the skill first**:

| Topic | Skill |
|-------|-------|
| TanStack Start (server fns, middleware, SSR, deploy) | `tanstack-start-best-practices/` |
| TanStack Form | `tanstack-form/` |
| TanStack Table | `tanstack-table/` |
| TanStack Query | `tanstack-query-best-practices/` |
| Supabase (auth, RLS, storage, migrations, edge fns) | `supabase/` (security checklist is mandatory) |
| shadcn (CLI, customization) | `shadcn/` |
| Tailwind 4 design tokens | `tailwind-design-system/` |
| Cloudflare Workers / Wrangler | `cloudflare/`, `wrangler/` |
| VPS hardening, Docker prod patterns | `devops-engineer/` |
| Kurdish/RTL i18n | `react-i18next/` |

## Build / dev commands

All commands run from **repo root**:

```bash
# App
bun install
bun run dev                            # http://localhost:3000
bun run build
bun run typecheck

# Supabase dev stack
bun run supabase:up                    # docker compose up -d
bun run supabase:down                  # stop containers

# Apply migrations (pipe each file)
for f in supabase/migrations/*.sql; do
  bun run supabase:migrate < "$f"
done

# shadcn components (run from repo root)
bunx shadcn@latest add <component>

# Type generation (uses node_modules/.bin/supabase; no CLI install needed)
bun run gen:types                      # writes src/lib/database.types.ts

# Setup (first time or fresh machine)
.\scripts\setup.ps1 dev          # Windows — runs setup wizard
bash scripts/setup.sh dev        # Linux/macOS

# Deploy
# VPS:  .\scripts\setup.ps1 deploy-vps  (or bash scripts/setup.sh deploy:vps)
# CF:   .\scripts\setup.ps1 deploy-cf   (or bash scripts/setup.sh deploy:cf)
```

See [docs/development.md](docs/development.md) for the full first-time setup walkthrough and all scripts.

## Things to avoid

- ❌ Adding `react-hook-form` (use `@tanstack/react-form`)
- ❌ Adding Prisma (Supabase is the data layer; SQL migrations only)
- ❌ Adding `next/*` imports
- ❌ Using `npm` or `node` — use `bun` everywhere
- ❌ Hand-writing any file that can be generated by a CLI tool
- ❌ Moving `vite.config.ts` or `components.json` out of the repo root — both tools require root placement
- ❌ Hardcoding factory name, logo, colors, currency anywhere — read from `site_settings`
- ❌ Reading `auth.users.user_metadata` for authorization decisions (it's user-editable; use `app_metadata` or DB role)
- ❌ Putting `service_role` keys in any code that could ship to the browser
- ❌ Bringing back the Telegram bot
