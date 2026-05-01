#!/usr/bin/env bash
# scripts/setup.sh -- Bootstrap Factory Management System
#
# Usage:
#   bash scripts/setup.sh             # interactive menu
#   bash scripts/setup.sh dev         # local development
#   bash scripts/setup.sh prod        # production setup (configures VPS + CF together)
#   bash scripts/setup.sh deploy:vps  # build Docker image with VITE vars, push to ghcr.io
#   bash scripts/setup.sh deploy:cf   # build CF Worker bundle, push secrets, deploy

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# On Windows (Git Bash / MSYS2), bun installs to ~/.bun/bin which is on the
# Windows PATH but not the bash PATH. Prepend it so require_cmd finds bun.
export PATH="$HOME/.bun/bin:$PATH"

# ---- Helpers -----------------------------------------------------------------
info()   { echo -e "${BLUE}->  ${NC}$*"; }
ok()     { echo -e "${GREEN}v   ${NC}$*"; }
warn()   { echo -e "${YELLOW}!   ${NC}$*"; }
die()    { echo -e "${RED}x   $*${NC}" >&2; exit 1; }
header() { echo -e "\n${BOLD}-- $* --${NC}"; }

require_cmd() { command -v "$1" &>/dev/null || die "'$1' is required. $2"; }

rand_hex()    { openssl rand -hex "$1" 2>/dev/null || bun -e "process.stdout.write(require('crypto').randomBytes($1).toString('hex'))"; }
rand_base64() { openssl rand -base64 "$1" 2>/dev/null | tr -d '/+=' || bun -e "process.stdout.write(require('crypto').randomBytes($1).toString('base64url'))"; }

# In-place sed that works on both GNU (Linux) and BSD (macOS)
sedi() { sed -i.bak "$@" && rm -f "${!#}.bak"; }

# Replace KEY=value in .env (handles special chars in value)
env_set() {
  local key="$1" val="$2" escaped
  escaped=$(printf '%s\n' "$val" | sed 's/[&/\]/\\&/g; s/$/\\/')
  escaped="${escaped%\\}"
  sedi "s|^${key}=.*|${key}=${escaped}|" .env
}

# Source .env into current shell
load_env() {
  # shellcheck disable=SC1091
  set -a; source .env 2>/dev/null; set +a
}

# ---- Prerequisites -----------------------------------------------------------
check_prereqs() {
  header "Checking prerequisites"
  require_cmd bun    "Install: curl -fsSL https://bun.sh/install | bash"
  require_cmd docker "Install Docker Desktop: https://docs.docker.com/get-docker/"
  docker info &>/dev/null || die "Docker is not running -- start Docker Desktop first."
  ok "bun $(bun --version)  |  docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
}

# ---- JWT key generation ------------------------------------------------------
generate_jwt_keys() {
  info "Generating JWT keys..."
  local output
  output=$(bun -e "
    const c = require('crypto');
    const secret = c.randomBytes(48).toString('base64url');
    const now = Math.floor(Date.now()/1000), exp = now + 10*365*24*3600;
    const h = { alg:'HS256', typ:'JWT' };
    const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const sign = (p) => { const d=b(h)+'.'+b(p); return d+'.'+c.createHmac('sha256',secret).update(d).digest('base64url'); };
    console.log(secret);
    console.log(sign({role:'anon',iss:'supabase',iat:now,exp}));
    console.log(sign({role:'service_role',iss:'supabase',iat:now,exp}));
  ")
  JWT_SECRET=$(echo "$output" | sed -n '1p')
  ANON_KEY=$(echo "$output" | sed -n '2p')
  SERVICE_ROLE_KEY=$(echo "$output" | sed -n '3p')
  ok "JWT keys generated"
}

# ---- Create .env from .env.example with all generated secrets ----------------
# After this call, run load_env to access POSTGRES_PASSWORD etc.
create_env() {
  [ -f .env.example ] || die ".env.example not found at repo root."
  cp .env.example .env

  generate_jwt_keys

  local POSTGRES_PASSWORD DASHBOARD_PASSWORD SECRET_KEY_BASE VAULT_ENC_KEY PG_META_CRYPTO_KEY LOGFLARE_TOKEN
  POSTGRES_PASSWORD=$(rand_base64 18)
  DASHBOARD_PASSWORD=$(rand_base64 16)
  SECRET_KEY_BASE=$(rand_hex 32)
  VAULT_ENC_KEY=$(rand_hex 16)
  PG_META_CRYPTO_KEY=$(rand_hex 16)
  LOGFLARE_TOKEN=$(rand_hex 16)

  env_set "JWT_SECRET"                     "$JWT_SECRET"
  env_set "ANON_KEY"                       "$ANON_KEY"
  env_set "SERVICE_ROLE_KEY"               "$SERVICE_ROLE_KEY"
  env_set "POSTGRES_PASSWORD"              "$POSTGRES_PASSWORD"
  env_set "DASHBOARD_PASSWORD"             "$DASHBOARD_PASSWORD"
  env_set "SECRET_KEY_BASE"                "$SECRET_KEY_BASE"
  env_set "VAULT_ENC_KEY"                  "$VAULT_ENC_KEY"
  env_set "PG_META_CRYPTO_KEY"             "$PG_META_CRYPTO_KEY"
  env_set "LOGFLARE_PUBLIC_ACCESS_TOKEN"   "$LOGFLARE_TOKEN"
  env_set "LOGFLARE_PRIVATE_ACCESS_TOKEN"  "$LOGFLARE_TOKEN"
  # Duplicate key fields -- dollar-brace expansion not supported in all runtimes
  env_set "PUBLIC_SUPABASE_ANON_KEY"       "$ANON_KEY"
  env_set "VITE_SUPABASE_ANON_KEY"         "$ANON_KEY"
  env_set "SUPABASE_SERVICE_ROLE_KEY"      "$SERVICE_ROLE_KEY"
}

# ---- Install dependencies ----------------------------------------------------
install_deps() {
  header "Installing dependencies"
  bun install
  ok "Dependencies installed"
}

# ---- Start Supabase via Docker Compose ---------------------------------------
start_supabase() {
  local prod="${1:-false}"
  header "Starting Supabase (Docker)"

  if [ "$prod" = "true" ]; then
    bun run supabase:prod:up
  else
    bun run supabase:up
  fi

  info "Waiting for containers to become healthy (up to 200s)..."
  echo ""

  local tries=0
  while [ $tries -lt 40 ]; do
    sleep 5
    tries=$((tries + 1))
    local all_statuses
    all_statuses=$(docker ps --filter "name=supabase" --format "{{.Names}}|{{.Status}}" 2>/dev/null || true)
    if [ -z "$all_statuses" ]; then
      info "[$tries/40] No supabase containers visible yet..."
      continue
    fi
    local total healthy starting unhealthy
    total=$(echo "$all_statuses" | grep -c '' || true)
    healthy=$(echo "$all_statuses"   | grep -c "healthy"                    || true)
    starting=$(echo "$all_statuses"  | grep -cE "starting|health: starting" || true)
    unhealthy=$(echo "$all_statuses" | grep -c "unhealthy"                  || true)
    info "[$tries/40] $healthy healthy  |  $starting starting  |  $unhealthy unhealthy  (of $total containers)"
    if [ "$unhealthy" -gt 0 ]; then
      echo ""
      warn "One or more containers are unhealthy. Check logs with:"
      warn "  docker compose -f supabase/docker-compose.yml logs --tail=50"
      break
    fi
    [ "$starting" -eq 0 ] && [ "$total" -gt 0 ] && break
  done

  echo ""
  docker ps --filter "name=supabase" --format "  {{.Names}}: {{.Status}}"
  echo ""
  ok "Supabase is up"
}

# ---- Apply SQL migrations ----------------------------------------------------
apply_migrations() {
  header "Applying database migrations"
  local count=0
  for f in supabase/migrations/*.sql; do
    [ -f "$f" ] || continue
    info "$(basename "$f")"
    bun run supabase:migrate < "$f"
    count=$((count + 1))
  done
  [ $count -eq 0 ] \
    && warn "No migration files found in supabase/migrations/" \
    || ok "$count migration(s) applied"
}

# ==============================================================================
# MODE: dev
# ==============================================================================
setup_dev() {
  echo -e "\n${BOLD}+===================================+"
  echo -e "| DEV - Local Development Setup     |"
  echo -e "+===================================+${NC}"

  check_prereqs
  install_deps

  header "Environment (.env)"
  if [ -f .env ]; then
    warn ".env already exists -- skipping generation. Edit manually if needed."
    load_env
  else
    create_env
    load_env
    ok ".env created for local development"
    echo ""
    echo -e "  Postgres password : ${BOLD}${POSTGRES_PASSWORD}${NC}"
    echo -e "  Studio password   : ${BOLD}${DASHBOARD_PASSWORD}${NC}"
    echo ""
    warn "Passwords above are in .env -- do NOT commit that file."
  fi

  start_supabase "false"
  apply_migrations

  echo ""
  echo -e "${GREEN}${BOLD}v  Dev environment ready!${NC}"
  echo ""
  echo -e "  Start : ${BOLD}bun run dev${NC}"
  echo -e "  Open  : ${BOLD}http://localhost:3000${NC}"
  echo ""
  echo "  First open -> setup wizard -> factory name, logo, colors, OWNER account."
  echo ""
  echo -e "  Daily : ${BOLD}bun run supabase:up && bun run dev${NC}"
  echo ""
}

# ==============================================================================
# MODE: prod -- configure BOTH VPS and CF in one pass, then start Supabase
# ==============================================================================
setup_prod() {
  echo -e "\n${BOLD}+================================================+"
  echo -e "| PROD - Production Setup (VPS + CF)             |"
  echo -e "+================================================+${NC}"
  echo ""
  echo "  Configures .env for BOTH VPS Docker and Cloudflare Workers."
  echo "  Run once on your server (or locally, then scp .env to the server)."
  echo ""
  warn "Requires Docker. Run deploy/vps/harden.sh first on a fresh server."
  echo ""
  read -rp "Continue? [y/N]: " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }

  check_prereqs
  install_deps

  header "Environment (.env)"
  if [ -f .env ]; then
    warn ".env already exists -- skipping generation. Edit manually if needed."
    load_env
  else
    create_env

    echo ""
    echo "  Configure domains and deployment targets:"
    echo ""
    read -rp "  App domain    (e.g. app.yourdomain.com):    " APP_DOMAIN
    read -rp "  API domain    (e.g. api.yourdomain.com):    " API_DOMAIN
    read -rp "  Studio domain (e.g. studio.yourdomain.com): " STUDIO_DOMAIN
    read -rp "  GitHub owner  (for image pull, e.g. myorg): " GH_OWNER
    read -rp "  App Docker tag (default: latest):            " APP_TAG
    APP_TAG="${APP_TAG:-latest}"

    # VPS routing
    env_set "SITE_URL"                 "https://${APP_DOMAIN}"
    env_set "ADDITIONAL_REDIRECT_URLS" "https://${APP_DOMAIN}"
    env_set "APP_DOMAIN"               "$APP_DOMAIN"
    env_set "API_DOMAIN"               "$API_DOMAIN"
    env_set "STUDIO_DOMAIN"            "$STUDIO_DOMAIN"
    env_set "GH_OWNER"                 "$GH_OWNER"
    env_set "APP_TAG"                  "$APP_TAG"

    # URL vars -- used by both VPS app container and CF Worker
    env_set "API_EXTERNAL_URL"         "https://${API_DOMAIN}"
    env_set "SUPABASE_PUBLIC_URL"      "https://${API_DOMAIN}"
    env_set "PUBLIC_SUPABASE_URL"      "https://${API_DOMAIN}"
    env_set "VITE_SUPABASE_URL"        "https://${API_DOMAIN}"

    # Internal Docker network URL for VPS app container only
    env_set "SUPABASE_URL"             "http://kong:8000"

    # Caddy basic-auth hash for Studio access
    local STUDIO_PASS STUDIO_PASS_HASH
    STUDIO_PASS=$(rand_base64 14)
    info "Generating Caddy password hash for Studio..."
    STUDIO_PASS_HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$STUDIO_PASS" 2>/dev/null) || {
      warn "Could not generate Caddy hash. Set STUDIO_PASS_HASH manually in .env."
      STUDIO_PASS_HASH="REPLACE_WITH_CADDY_HASH"
    }
    env_set "STUDIO_USER"       "admin"
    env_set "STUDIO_PASS_HASH"  "$STUDIO_PASS_HASH"

    load_env
    ok ".env created for production (VPS + CF)"
    echo ""
    echo -e "  App URL           : ${BOLD}https://${APP_DOMAIN}${NC}"
    echo -e "  API URL           : ${BOLD}https://${API_DOMAIN}${NC}"
    echo -e "  Postgres password : ${BOLD}${POSTGRES_PASSWORD}${NC}"
    echo -e "  Studio password   : ${BOLD}${STUDIO_PASS}${NC}"
    echo -e "  Dashboard password: ${BOLD}${DASHBOARD_PASSWORD}${NC}"
    echo ""
    warn "Save these passwords -- they will not be shown again."
  fi

  start_supabase "true"
  apply_migrations

  echo ""
  echo -e "${GREEN}${BOLD}v  Production environment ready!${NC}"
  echo ""
  echo "  Supabase is running. Both VPS and CF deploy targets are configured."
  echo ""
  echo "  Deploy the app:"
  echo -e "    VPS : ${BOLD}bash scripts/setup.sh deploy:vps${NC}"
  echo -e "    CF  : ${BOLD}bash scripts/setup.sh deploy:cf${NC}"
  echo ""
  echo "  To deploy both at once:"
  echo -e "    ${BOLD}bash scripts/setup.sh deploy:vps && bash scripts/setup.sh deploy:cf${NC}"
  echo ""
}

# ==============================================================================
# MODE: deploy:vps -- build Docker image with VITE vars baked in, push to ghcr.io
# ==============================================================================
deploy_vps() {
  echo -e "\n${BOLD}+================================================+"
  echo -e "| DEPLOY:VPS - Build and Push Docker Image       |"
  echo -e "+================================================+${NC}"
  echo ""

  [ -f .env ] || die ".env not found. Run 'bash scripts/setup.sh prod' first."
  load_env

  check_prereqs

  local VITE_URL="${VITE_SUPABASE_URL:-}"
  local VITE_ANON="${VITE_SUPABASE_ANON_KEY:-}"
  local GH_OWNER="${GH_OWNER:-}"
  local APP_TAG="${APP_TAG:-latest}"

  [ -n "$VITE_URL"  ] || die "VITE_SUPABASE_URL is not set in .env. Run 'prod' setup first."
  [ -n "$VITE_ANON" ] || die "VITE_SUPABASE_ANON_KEY is not set in .env. Run 'prod' setup first."
  [ -n "$GH_OWNER"  ] || die "GH_OWNER is not set in .env. Run 'prod' setup first."

  local IMAGE="ghcr.io/${GH_OWNER}/fms-app:${APP_TAG}"

  header "Building Docker image"
  info "Image : $IMAGE"
  info "Baking VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY into browser bundle..."

  docker build \
    --build-arg "VITE_SUPABASE_URL=${VITE_URL}" \
    --build-arg "VITE_SUPABASE_ANON_KEY=${VITE_ANON}" \
    -t "$IMAGE" \
    .
  ok "Build complete: $IMAGE"

  header "Pushing to GitHub Container Registry"
  warn "Make sure you are logged in: docker login ghcr.io -u <github-username>"
  docker push "$IMAGE"
  ok "Pushed: $IMAGE"

  echo ""
  echo -e "${GREEN}${BOLD}v  VPS image pushed!${NC}"
  echo ""
  echo "  On your VPS, restart the app container:"
  echo -e "    ${BOLD}docker compose -f supabase/docker-compose.prod.yml pull app${NC}"
  echo -e "    ${BOLD}docker compose -f supabase/docker-compose.prod.yml up -d app${NC}"
  echo ""
}

# ==============================================================================
# MODE: deploy:cf -- build CF Worker bundle, push secrets, deploy via wrangler
# ==============================================================================
deploy_cf() {
  echo -e "\n${BOLD}+================================================+"
  echo -e "| DEPLOY:CF - Cloudflare Workers Deployment      |"
  echo -e "+================================================+${NC}"
  echo ""

  [ -f .env ] || die ".env not found. Run 'bash scripts/setup.sh prod' first."
  load_env

  check_prereqs
  require_cmd wrangler "Run: bun add -g wrangler"

  local VITE_URL="${VITE_SUPABASE_URL:-}"
  local VITE_ANON="${VITE_SUPABASE_ANON_KEY:-}"
  [ -n "$VITE_URL"  ] || die "VITE_SUPABASE_URL is not set in .env. Run 'prod' setup first."
  [ -n "$VITE_ANON" ] || die "VITE_SUPABASE_ANON_KEY is not set in .env. Run 'prod' setup first."

  install_deps

  header "Building for Cloudflare Workers"
  info "Baking VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY into browser bundle..."

  DEPLOY_TARGET=cloudflare \
    VITE_SUPABASE_URL="$VITE_URL" \
    VITE_SUPABASE_ANON_KEY="$VITE_ANON" \
    bun run build
  ok "CF build complete"

  local wrangler_cfg="deploy/cloudflare/wrangler.toml"
  local ANON_SECRET="${PUBLIC_SUPABASE_ANON_KEY:-$VITE_ANON}"

  header "Pushing secrets to Cloudflare Worker"
  echo "${ANON_SECRET}"            | wrangler secret put PUBLIC_SUPABASE_ANON_KEY  --config "$wrangler_cfg"
  echo "${SUPABASE_SERVICE_ROLE_KEY:-}" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config "$wrangler_cfg"

  if [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ "${R2_ACCESS_KEY_ID}" != "replace-me" ]; then
    echo "${R2_ACCESS_KEY_ID}"     | wrangler secret put R2_ACCESS_KEY_ID     --config "$wrangler_cfg"
    echo "${R2_SECRET_ACCESS_KEY}" | wrangler secret put R2_SECRET_ACCESS_KEY --config "$wrangler_cfg"
    ok "R2 backup secrets set"
  else
    warn "R2 credentials not set -- backups will not work until you add them to .env."
  fi

  header "Deploying to Cloudflare Workers"
  bun run deploy:cf
  ok "CF deploy complete"

  echo ""
  echo -e "${GREEN}${BOLD}v  Deployed to Cloudflare Workers!${NC}"
  echo ""
  echo "  Worker URL shown above."
  echo "  To add a custom domain, edit 'routes' in deploy/cloudflare/wrangler.toml"
  echo ""
  echo "  Redeploy after code changes:"
  echo -e "    ${BOLD}bash scripts/setup.sh deploy:cf${NC}"
  echo ""
}

# ==============================================================================
# Entrypoint
# ==============================================================================
MODE="${1:-}"

if [ -z "$MODE" ]; then
  echo ""
  echo -e "${BOLD}Factory Management System -- Setup${NC}"
  echo ""
  echo "  1) dev        -- Local development  (Docker backend + Vite dev server)"
  echo "  2) prod       -- Production setup   (configures VPS + CF together, starts Supabase)"
  echo "  3) deploy:vps -- Deploy to VPS      (build Docker image, push to ghcr.io)"
  echo "  4) deploy:cf  -- Deploy to CF       (build CF Worker, deploy via wrangler)"
  echo ""
  read -rp "Choose [dev / prod / deploy:vps / deploy:cf]: " MODE
fi

case "$MODE" in
  dev|1)        setup_dev  ;;
  prod|2)       setup_prod ;;
  deploy:vps|3) deploy_vps ;;
  deploy:cf|4)  deploy_cf  ;;
  *) die "Unknown mode '${MODE}'. Use: dev | prod | deploy:vps | deploy:cf" ;;
esac
