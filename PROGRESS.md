# Rewrite progress

Started 2026-04-25.

## Phase 1 — Supabase + DB layer  ✅ done
- [x] `supabase/bootstrap.sh` (vendors official supabase/docker tree)
- [x] `supabase/docker-compose.prod.yml` (Caddy+TLS overlay, app, hardening)
- [x] `supabase/Caddyfile` (TLS, HSTS, Studio basic-auth)
- [x] Migrations:
  - [x] `0001_initial_schema.sql` — all entities incl. `site_settings`, `dollar`/`dollar_history`, `backup_runs`; soft-delete + partial indexes; trigram indexes
  - [x] `0002_rls_policies.sql` — role-aware RLS for every table
  - [x] `0003_storage_and_cron.sql` — buckets + pg_cron + pg_net wired to backup edge fn
  - [x] `0004_permissions.sql` — singleton-OWNER constraint + `permission_catalog` + `user_permissions` + `has_permission()` + reads/writes rewired through it + `transfer_ownership()`
- [x] `supabase/functions/backup/index.ts` — pg_dump → R2/Supabase → 2-latest rotation → audit
- [x] `.env.example`
- [x] `deploy/vps/harden.sh`

## Phase 2 — TanStack Start scaffold  ✅ done
- [x] `app/package.json`, `app/app.config.ts` (preset switch via DEPLOY_TARGET), `app/tsconfig.json`
- [x] `app/components.json` (CLI-driven; do not hand-author primitives — use `bunx shadcn@latest add`)
- [x] `app/src/styles/app.css` — Tailwind 4 `@theme`, runtime branding via CSS vars
- [x] `app/src/lib/supabase.ts`, `app/src/lib/site-settings.ts`, `app/src/lib/auth.ts`, `app/src/lib/utils.ts`
- [x] `app/src/components/data-table.tsx`, `app/src/components/permission-grid.tsx`, `app/src/components/form-fields.tsx`
- [x] `app/src/routes/__root.tsx` (loads settings, applies branding before paint)
- [x] `app/src/routes/index.tsx`, `setup.tsx`, `login.tsx`, `healthz.ts`
- [x] `app/src/routes/app/route.tsx` (sidebar layout, auth guard, every module linked)
- [x] `app/src/routes/app/dashboard.tsx` (KPIs)

## Phase 3 — Domain modules  ✅ done
- [x] `dollar.tsx` — current rate + 30-row history
- [x] `customers.tsx` — list + dialog form + soft-delete
- [x] `products.tsx` — list + dialog form + image upload to `products` bucket
- [x] `employees.tsx` — list + dialog form + record bonus/punishment/absent/overtime
- [x] `sales.tsx` — multi-line items + customer picker + cash/loan + collect loan payment
- [x] `expenses.tsx`
- [x] `companies.tsx`
- [x] `purchases.tsx` — company purchases + record installments
- [x] `reports.tsx` — sales/expenses/purchases by month, totals
- [x] `settings/branding.tsx` — full site_settings editor with logo upload
- [x] `settings/users.tsx` — create/role/delete users + permission grid
- [x] `settings/backups.tsx` — runs list + manual + cron/provider/keep_n config

## Phase 4 — Forms/tables sweep  ✅ done
- [x] All forms use `@tanstack/react-form` via shared `<TextField>` / `<SelectField>` / `<TextAreaField>` helpers
- [x] All tables use TanStack Table v8 via `<DataTable>` (sort/filter/paginate)

## Phase 5 — Backups + scheduled jobs  🟡 mostly done
- [x] pg_cron + edge function pipeline (R2 / Supabase bucket)
- [x] 2-latest rotation
- [x] `backup_runs` audit ledger
- [x] App UI: `/app/settings/backups` — list, manual trigger, change provider/cron/keep_n, download
- [ ] Local/VPS destination handler — needs FS access, deferred until tested in prod
- [ ] Restore UI — defer until first real backup verified

## Phase 6 — Deployment  ✅ done
- [x] VPS path: `harden.sh`, prod compose overlay, Caddyfile, healthcheck cron
- [x] Cloudflare path: `deploy/cloudflare/wrangler.toml` (paths fixed to `.output/`)
- [x] `Dockerfile` (multi-stage bun, non-root, healthcheck)
- [x] `.github/workflows/ci.yml` — typecheck/build (bun, runs from root)
- [x] `.github/workflows/release.yml` — ghcr image push on tag + optional CF deploy
- [x] `src/routes/healthz.ts` — liveness/readiness probe

## Phase 7 — Cleanup & reorganisation  ✅ done
- [x] `docs/architecture.md`, `docs/development.md`, `docs/deployment.md`
- [x] Legacy Next.js + Prisma + MySQL deleted; `v2/` promoted to root
- [x] `app/` → flattened: `app.config.ts` + `components.json` at root, sources in `src/`
- [x] All tooling switched to bun (package.json, Dockerfile, CI, docs)
- [x] `src/router.tsx` — router instance + `RouterContext` type + `Register` declaration
- [x] `src/routes/__root.tsx` — `createRootRouteWithContext<RouterContext>()`, typed loader
- [x] `src/routes/app/route.tsx` — `<Link>` (not `<a>`), fixed `loader` + `useLoaderData()`
- [x] `src/lib/env.server.ts` — Zod-validated server env
- [x] `src/lib/supabase.ts` — wired to `env.server.ts`
- [x] Tailwind canonical classes fixed across all 17 source files (`bg-background` not `bg-(--color-background)`)
- [x] `.gitignore` — replaced legacy Next.js entries with current stack
- [ ] Final commit

## Smoke-test checklist (run before final commit)

All commands from **repo root**:

1. `cd supabase && ./bootstrap.sh && docker compose --env-file ../.env up -d && cd ..`
2. Wait for `db` healthy → `supabase db push`
3. `bun install`
4. `bunx shadcn@latest init && bunx shadcn@latest add button input label card dialog select table dropdown-menu tabs form alert-dialog badge tooltip toast`
5. `bun run dev` → http://localhost:3000 → first-run wizard
6. Sign in as OWNER, click through every sidebar item, create a customer + product + sale
7. From `/app/settings/backups`, click `Run backup now` → confirm entry appears in history
8. `bun run typecheck` — must pass clean
9. Once green: `git add -A && git commit -m "feat: complete rewrite — TanStack Start + Supabase + bun"`
