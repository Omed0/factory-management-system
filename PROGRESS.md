# FMS – Project Progress Tracker

> Single source of truth for what is done, pending, and decided.
> Update this file at the start and end of every session.
> **Last updated: 2026-04-28**

---

## Stack (reference)

| Layer | Technology |
|-------|-----------|
| App framework | TanStack Start (React 19, file-based router, server fns) |
| Database | Self-hosted Supabase — Postgres 15, Auth, Storage, Edge Fns, pg_cron |
| Styling | Tailwind 4 + CSS-first `@theme`, shadcn components |
| Forms | TanStack Form |
| Tables | TanStack Table v8 + shared `DataTable` component |
| Client cache | TanStack Query |
| Backup storage | Cloudflare R2 (primary) / Supabase Storage (fallback) |
| Package manager | Bun |

---

## Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done and working |
| 🚧 | Partially built / in progress |
| ❌ | Missing — needs to be built |
| 🐛 | Known bug |
| 📋 | Planned, not started |

---

## Migration History (Next.js → TanStack Start)

Old stack: Next.js + Prisma + MySQL  
New stack: TanStack Start + self-hosted Supabase (Postgres 15)

| Module | Old | New |
|--------|-----|-----|
| Database schema | MySQL via Prisma | Postgres via Supabase migrations |
| Auth | Custom | Supabase Auth + profiles mirror |
| All CRUD pages | ✅ had | ✅ rebuilt |
| RLS policies | ❌ didn't have | ✅ added |
| Backup system | ❌ didn't have | ✅ built 2026-04-28 |
| Loan payment history UI | ✅ had | 🚧 data exists, no UI yet |
| Sale detail view (items) | ✅ had | ❌ missing |
| Invoices / print receipts | ✅ had | ❌ missing |
| Money equality dashboard | ✅ had | ❌ missing |
| Reports page | ✅ had | ❌ missing |
| Employee pay slips | ✅ had | ❌ missing |
| Customer account statements | ✅ had | ❌ missing |

---

## Pages & Modules — Current State

### `/app/dashboard`
- ✅ KPI cards: total sales count, total revenue, outstanding loan balance, active customers, USD rate
- ❌ Expenses & purchases totals missing from dashboard
- ❌ Money equality section (total in vs total out vs loans outstanding)
- ❌ Charts / trends

### `/app/customers`
- ✅ List with search + pagination
- ✅ Create / edit / soft-delete
- ❌ Customer statement (all their sales + loan payments, printable)
- ❌ Customer total loan balance shown in list

### `/app/products`
- ✅ List with search + pagination
- ✅ Create / edit / soft-delete
- ❌ Product image upload
- ❌ Stock / inventory quantity tracking

### `/app/sales`
- ✅ List with search + pagination
- ✅ Create sale (multi-item, CASH / LOAN, customer, discount, dollar snapshot)
- ✅ Collect loan payment (amount + note saved to `paid_loans`)
- ✅ **Sale detail drawer** (items + payment history) — added 2026-04-28
- ✅ **Sale invoice** (printable) — added 2026-04-28
- ✅ **Loan payment receipt** (printable) — added 2026-04-28
- 🐛 Stale `database.types.ts` causes TS errors — fix: `bun run gen:types`

### `/app/purchases`
- ✅ List with search + pagination
- ✅ Create purchase (CASH / LOAN, company, dollar snapshot)
- ✅ Pay installment (amount + note)
- ✅ **Purchase detail drawer** (payment history) — added 2026-04-28
- ✅ **Purchase payment receipt** (printable) — added 2026-04-28

### `/app/employees`
- ✅ List with search + pagination
- ✅ Create / edit / soft-delete (salary + dollar snapshot)
- ✅ Employee actions: BONUS / PUNISHMENT / ABSENT / OVERTIME
- ❌ Action history drawer (no UI to see all actions for one employee)
- ❌ Monthly pay slip (printable)

### `/app/expenses`
- ✅ List with search + pagination
- ✅ Create / soft-delete (title, amount, note, dollar snapshot)
- ❌ Expense receipt (printable)
- ❌ Category grouping

### `/app/companies`
- ✅ List with search + pagination
- ✅ Create / edit / soft-delete
- ❌ Company purchase history / statement

### `/app/dollar`
- ✅ Current rate display + update
- ✅ History log (`dollar_history`)
- ❌ Rate chart over time

### `/app/reports`
- 🚧 File exists, no real implementation

### `/app/settings/branding`
- ✅ Factory name, logo, colors, address, currency, language, fiscal year

### `/app/settings/users`
- ✅ User list + role management (OWNER / ADMIN / USER)
- ✅ Granular per-user permissions

### `/app/settings/backups`  ← rewritten 2026-04-28
- ✅ Provider: R2 / Supabase Storage / Local download / VPS disk
- ✅ Schedule (cron presets + custom), keep-N, R2 credentials in DB
- ✅ Manual backup (server-side, no edge-fn)
- ✅ Restore from history row or uploaded file
- ✅ Confirmation dialogs before restore
- ✅ Backup rotation
- 🐛 Migrations 006 & 007 must be applied (see commands below)

---

## Feature Backlog

### P0 — Fix / apply immediately
- [x] `saveConfig` crashed with "r2_access_key_id column not found" — **FIXED 2026-04-28**
- [ ] Apply migration 006 (R2 credential columns)
- [ ] Apply migration 007 (sequence-reset fn)
- [ ] `bun run gen:types` — clear ~69 stale TS errors

### P1 — Core MVP (in progress)
- [x] DataTable: page-size selector — **DONE 2026-04-28**
- [x] Sales: detail drawer (items + loan payment history) — **DONE 2026-04-28**
- [x] Sale invoice (printable) — **DONE 2026-04-28**
- [x] Loan payment receipt (printable) — **DONE 2026-04-28**
- [x] Purchase: detail drawer (payment history) — **DONE 2026-04-28**
- [x] Purchase payment receipt (printable) — **DONE 2026-04-28**
- [ ] **Money equality dashboard section** — total revenue, expenses, purchases, outstanding loans, net cash
- [ ] **Dashboard: add expenses & purchases totals to KPI cards**

### P2 — High-value additions
- [ ] Employee action history drawer + monthly pay slip (printable)
- [ ] Customer statement (all sales + payments, printable)
- [ ] Expense receipt (printable)
- [ ] Company purchase history view
- [ ] Reports page (date-range P&L, top customers, top products)

### P3 — Invoice customization (Settings)
New tab or card in `/app/settings/`:
- [ ] Show/hide logo on invoices
- [ ] Custom header / footer text per invoice type
- [ ] Custom invoice number prefix
- [ ] Toggle which fields appear (tax ID, phone, address, note, etc.)
- [ ] Paper size selector (A4 / Letter / Receipt strip)
- [ ] Live invoice preview in settings

### P4 — Future
- [ ] Product image upload (Supabase Storage)
- [ ] Stock / inventory quantity tracking (new `product_stock` table)
- [ ] Dollar rate chart
- [ ] Dashboard charts (revenue trend, loan trend)
- [ ] Full audit log
- [ ] Push / email notifications for overdue loans
- [ ] Supplier performance report

---

## Invoice System (how it works now)

Each printable invoice is rendered as a React component inside a `<Dialog>` that has **print-only CSS** applied (`@media print { /* hide everything except invoice div */ }`). Clicking **Print** calls `window.print()` — the browser's native print dialog handles layout and "Save as PDF".

Factory branding (name, logo, address, phone, tax ID) is pulled from `site_settings` passed in via the root loader context.

| Invoice / Receipt | Triggered from | Data loaded |
|-------------------|---------------|------------|
| Sale invoice | Sales list → detail drawer → Print | `sales` + `sale_items` + `customers` |
| Loan payment receipt | After collecting payment | `paid_loans` + `sales` + `customers` |
| Purchase invoice | Purchases list → detail drawer → Print | `company_purchases` + `companies` |
| Purchase payment receipt | After paying installment | `purchase_payments` + `company_purchases` + `companies` |

---

## Pending Migrations

Run from repo root against your local Supabase Docker stack:

```bash
bun run supabase:migrate < supabase/migrations/20260425000006_backup_credentials.sql
bun run supabase:migrate < supabase/migrations/20260425000007_restore_sequences.sql
bun run gen:types
```

---

## Key Architectural Decisions

| Decision | Why |
|----------|-----|
| `dollar` column on every transactional row | Snapshot of USD rate at record time — must never change retroactively |
| Soft delete via `deleted_at` | Active-row uniqueness via partial unique indexes (`WHERE deleted_at IS NULL`) |
| Server fns for all mutations | RLS enforced on every write; no REST API layer |
| `getSupabaseServer()` for user queries | RLS on — safe for normal reads |
| `getSupabaseAdmin()` only in trusted server code | Bypasses RLS — service role; used for backups, restore, admin ops only |
| R2 credentials in `site_settings` | OWNER can update them from UI without touching env vars |
| Invoices via `window.print()` | No PDF library needed; browser handles layout + "Save as PDF" |
| Manual backup via server fn (not edge fn) | Edge fn had JSON parse issues with HTTP calls from server fn; direct is simpler |
