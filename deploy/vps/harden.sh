#!/usr/bin/env bash
# VPS hardening — Debian/Ubuntu. Run as root on a fresh server.
#
# What this does:
#   1. System update + unattended-upgrades for security patches
#   2. Non-root sudo user with SSH key, root SSH disabled, password auth disabled
#   3. UFW firewall (default-deny) → 22/tcp, 80/tcp, 443/tcp only
#   4. fail2ban with sshd jail
#   5. Docker + Compose plugin
#   6. Swap file (2G) if none
#   7. Healthcheck cron that emails on container failure
#
# After this script:
#   * git clone <repo> /opt/fms
#   * cd /opt/fms && cp .env.example .env && nano .env   (fill in secrets)
#   * cd supabase && ./bootstrap.sh                       (vendor upstream docker files)
#   * cd /opt/fms && bun run supabase:prod:up             (start all containers)
#   * Apply migrations: bun run supabase:migrate < supabase/migrations/*.sql
#
# Idempotent — safe to re-run.

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Run as root (sudo)." >&2; exit 1
fi

NEW_USER="${NEW_USER:-fms}"
SSH_PUBKEY="${SSH_PUBKEY:-}"
APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN required}"
ADMIN_EMAIL="${ADMIN_EMAIL:?ADMIN_EMAIL required}"

# ── 1. updates ───────────────────────────────────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get -y -qq upgrade
apt-get -y -qq install \
  ca-certificates curl gnupg lsb-release ufw fail2ban \
  unattended-upgrades msmtp-mta postfix-pcre

dpkg-reconfigure -f noninteractive unattended-upgrades

# ── 2. user + ssh ────────────────────────────────────────────────────────────
if ! id -u "$NEW_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$NEW_USER"
  usermod -aG sudo "$NEW_USER"
fi

if [ -n "$SSH_PUBKEY" ]; then
  install -d -m 700 -o "$NEW_USER" -g "$NEW_USER" "/home/$NEW_USER/.ssh"
  echo "$SSH_PUBKEY" > "/home/$NEW_USER/.ssh/authorized_keys"
  chown "$NEW_USER:$NEW_USER" "/home/$NEW_USER/.ssh/authorized_keys"
  chmod 600 "/home/$NEW_USER/.ssh/authorized_keys"
fi

# Disable root SSH login + password auth
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh || systemctl reload sshd

# ── 3. firewall ──────────────────────────────────────────────────────────────
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'ssh'
ufw allow 80/tcp comment 'http'
ufw allow 443/tcp comment 'https'
echo "y" | ufw enable

# ── 4. fail2ban ──────────────────────────────────────────────────────────────
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# ── 5. docker ────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/$(. /etc/os-release; echo $ID)/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/$(. /etc/os-release; echo $ID) \
    $(. /etc/os-release; echo $VERSION_CODENAME) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get -y -qq install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  usermod -aG docker "$NEW_USER"
fi
systemctl enable --now docker

# ── 6. swap ──────────────────────────────────────────────────────────────────
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# ── 7. healthcheck cron ──────────────────────────────────────────────────────
cat > /usr/local/bin/fms-healthcheck.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
unhealthy=$(docker ps --filter health=unhealthy --format '{{.Names}}' || true)
exited=$(docker ps -a --filter status=exited --filter label=com.docker.compose.project=supabase --format '{{.Names}}' || true)
if [ -n "$unhealthy$exited" ]; then
  msg="FMS healthcheck failed on $(hostname)\nUnhealthy: $unhealthy\nExited: $exited"
  echo -e "$msg" | mail -s "[FMS] container health alert" "ADMIN_EMAIL_PLACEHOLDER" || true
fi
EOF
sed -i "s|ADMIN_EMAIL_PLACEHOLDER|$ADMIN_EMAIL|" /usr/local/bin/fms-healthcheck.sh
chmod +x /usr/local/bin/fms-healthcheck.sh
( crontab -l 2>/dev/null | grep -v fms-healthcheck.sh; echo "*/5 * * * * /usr/local/bin/fms-healthcheck.sh" ) | crontab -

echo "✓ Hardening complete."
echo "  Server IP : $(curl -s ifconfig.me)"
echo "  App domain: $APP_DOMAIN"
echo ""
echo "  Next steps:"
echo "  1.  su - $NEW_USER"
echo "  2.  git clone <your-repo> /opt/fms && cd /opt/fms"
echo "  3.  cp .env.example .env && nano .env"
echo "  4.  cd supabase && ./bootstrap.sh && cd .."
echo "  5.  bun run supabase:prod:up"
echo "  6.  bun run supabase:migrate < supabase/migrations/20260425000001_initial_schema.sql"
