# Deployment

> See also: [Architecture](architecture.md) · [Development](development.md) · [`deploy/vps/harden.sh`](../deploy/vps/harden.sh) · [`deploy/cloudflare/wrangler.toml`](../deploy/cloudflare/wrangler.toml)

Two paths, both first-class.

## Path A — VPS (full stack on one host)

Best for: a single business running their own factory app, no Cloudflare account.
Everything runs on one Debian/Ubuntu server.

### 1. Provision a VPS

Any provider (Hetzner / DO / Linode / OVH).

| Tier | vCPU | RAM | Disk | Use case |
|------|------|-----|------|----------|
| **Minimum** | 2 | 4 GB | 40 GB SSD | Single user / evaluation |
| **Recommended** | 4 | 8 GB | 80 GB SSD | Production: 1–20 concurrent users |
| **Comfortable** | 4–8 | 16 GB | 160 GB SSD | 20+ users or heavy reporting |

Supabase (Postgres + PostgREST + Auth + Storage + Kong + Studio + pg_cron) alone needs ~2 GB RAM at idle; the app container adds ~256 MB. 4 GB is the safe floor for production. The 2 GB swap file added by `harden.sh` covers spikes but is not a substitute for RAM.

OS: Debian 12 or Ubuntu 22.04+. Public IPv4. DNS A record → your domain.

### 2. Harden + install dependencies

SSH in as root and run:

```bash
git clone <this-repo> /opt/fms
NEW_USER=fms \
SSH_PUBKEY="ssh-ed25519 AAAA…your-key" \
APP_DOMAIN=app.your-domain.com \
ADMIN_EMAIL=you@your-domain.com \
bash /opt/fms/deploy/vps/harden.sh
```

This script:
- Updates the system + enables unattended security upgrades
- Creates a non-root sudo user with your SSH key
- Disables root SSH login and password authentication
- Configures UFW (allow 22/80/443 only)
- Installs and configures fail2ban (sshd jail)
- Installs Docker + Compose plugin
- Adds a 2 GB swap file
- Schedules a `*/5` cron health-check that emails on container failure

After this step, **SSH only works for the new user via key**.

### 3. Bootstrap Supabase

As the new (non-root) user:

```bash
cd /opt/fms
cp .env.example .env
nano .env            # fill in passwords, JWT/keys, SUPABASE_PUBLIC_URL=https://api.your-domain.com, etc.

cd supabase
./bootstrap.sh       # vendor official supabase/docker tree
```

### 4. Configure Caddy

In `/opt/fms/.env`, add:

```bash
APP_DOMAIN=app.your-domain.com
API_DOMAIN=api.your-domain.com
STUDIO_DOMAIN=studio.your-domain.com
STUDIO_USER=admin
# Generate the studio password hash:
docker run --rm caddy:2-alpine caddy hash-password --plaintext '<your-password>'
# Paste the output into:
STUDIO_PASS_HASH=...
```

### 5. Bring it up

```bash
cd /opt/fms
bun run supabase:prod:up
docker compose -f supabase/docker-compose.yml ps    # verify all containers healthy
```

Caddy will automatically obtain Let's Encrypt certificates for the three domains.

### 6. Apply migrations

```bash
cd /opt/fms
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  bun run supabase:migrate < "$f"
done
```

### 7. First-run wizard

Open `https://app.your-domain.com` → fill in the wizard → done.

### Maintenance

- Logs: `docker compose logs -f <service>`
- Healthcheck: the `/usr/local/bin/fms-healthcheck.sh` cron emails you on failure
- Image updates: `docker compose pull && docker compose up -d`
- App updates: build a new image (`docker build -t fms-app:v<N> /opt/fms`),
  pin via `${APP_TAG}` in `.env`, then `docker compose up -d app`

---

## Path B — Cloudflare Workers (split tier)

Best for: you want global edge caching for the app and don't mind running
Supabase on a separate VPS.

In this topology:

```
[Browser] ──► Cloudflare Worker (TanStack Start)
                       │
                       └─► HTTPS to api.your-domain.com (VPS Caddy → Kong)
                                                            │
                                              [Supabase + Postgres on VPS]
```

### 1. Get Supabase running on a VPS

Follow Path A steps 1-6, but skip the `app` container in
`docker-compose.prod.yml` (comment it out or use `--profile supabase-only`).

### 2. Build the app for Cloudflare

```bash
# From repo root:
DEPLOY_TARGET=cloudflare bun run build
```

This produces a Workers-compatible bundle in `.output/`.

### 3. Set Cloudflare secrets

```bash
wrangler secret put PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

Set non-secret vars in `deploy/cloudflare/wrangler.toml` `[vars]` (already
includes `DEPLOY_TARGET`). Set `PUBLIC_SUPABASE_URL` to
`https://api.your-domain.com`.

### 4. Deploy

```bash
wrangler deploy --config deploy/cloudflare/wrangler.toml
```

### 5. R2 bucket

Create `fms-backups` in your Cloudflare dashboard. The `[[r2_buckets]]` binding
in `wrangler.toml` exposes it as `env.BACKUPS` to the Worker.

### CI/CD

`.github/workflows/release.yml` includes an optional `cloudflare` job and always builds a Docker image on tag.

**Required GitHub repo secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret | Value |
|--------|-------|
| `VITE_SUPABASE_URL` | Public Kong URL baked into the browser bundle, e.g. `https://api.your-domain.com`. Required for Storage uploads (logo, product images). |
| `CLOUDFLARE_API_TOKEN` | CF token with Workers:Edit permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

**Required GitHub repo variable** (Actions → Variables):

| Variable | Value |
|----------|-------|
| `DEPLOY_CLOUDFLARE` | `true` to auto-deploy to Workers on tag push |

---

## Backups in production

Both paths use the same backup pipeline (driven by `pg_cron` + Edge Function +
DB-driven `site_settings.backup_*`):

- **Provider** — set in the UI (`/app/settings/backups`, OWNER only).
  Recommended: `r2` for production (off-site, cheap, fast restore).
- **Cron** — daily at 03:00 UTC by default. Edit in UI.
- **Retention** — keep last N (default 2). Older backups auto-deleted.
- **Manual** — `Run backup now` button triggers immediately.
- **Restore** — currently manual: download the `.ndjson.gz` from R2/Studio →
  decompress → `cat | jq -r ... | psql`. A UI restore flow is deferred.

## Health monitoring

- App: `GET /healthz` — 200 = up + DB reachable, 503 = DB unreachable.
- Caddy: `health_uri /healthz` already configured in the prod Caddyfile.
- VPS: `*/5 * * * * /usr/local/bin/fms-healthcheck.sh` emails `ADMIN_EMAIL`
  on any unhealthy/exited container.

## Log rotation

For long-running deploys add to `/etc/docker/daemon.json` on the VPS:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
```

Then `systemctl restart docker`.
