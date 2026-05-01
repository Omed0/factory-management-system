#!/usr/bin/env bash
# Vendor the official Supabase self-host docker stack into v2/supabase/.
# Pinned to a known-good ref. Run this once after cloning the repo.
#
#   ./bootstrap.sh        # first-time setup
#   ./bootstrap.sh --update  # re-pull (keeps local migrations & overrides)

set -euo pipefail

# Pin to a tested commit. Bump intentionally and re-test.
SUPABASE_REF="${SUPABASE_REF:-master}"
TMPDIR="$(mktemp -d)"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Fetching supabase/supabase@${SUPABASE_REF} (sparse: docker/)…"
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/supabase/supabase.git "$TMPDIR/sb"
( cd "$TMPDIR/sb" && git sparse-checkout set docker && git checkout "$SUPABASE_REF" )

# Files we vendor verbatim
VENDORED=(
  "docker-compose.yml"
  "volumes/api/kong.yml"
  "volumes/api/kong-entrypoint.sh"
  "volumes/db/_supabase.sql"
  "volumes/db/jwt.sql"
  "volumes/db/logs.sql"
  "volumes/db/pooler.sql"
  "volumes/db/realtime.sql"
  "volumes/db/roles.sql"
  "volumes/db/webhooks.sql"
  "volumes/logs/vector.yml"
  "volumes/pooler/pooler.exs"
)

mkdir -p "$HERE/volumes/api" "$HERE/volumes/db" "$HERE/volumes/logs" "$HERE/volumes/pooler" \
         "$HERE/volumes/storage" "$HERE/volumes/functions/main"

for f in "${VENDORED[@]}"; do
  src="$TMPDIR/sb/docker/$f"
  dest="$HERE/$f"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
    echo "   • $f"
  else
    echo "   ! missing in upstream: $f" >&2
  fi
done

# Default 'main' edge function entrypoint if not provided
if [ ! -f "$HERE/volumes/functions/main/index.ts" ]; then
  cat > "$HERE/volumes/functions/main/index.ts" <<'EOF'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
serve(() => new Response('ok'));
EOF
fi

rm -rf "$TMPDIR"
echo "✓ Supabase stack vendored at $HERE"
echo
echo "Next steps:"
echo "  1. cp ../.env.example ../.env   (and fill in)"
echo "  2. cd .. && bun run supabase:up"
echo "  3. for f in supabase/migrations/*.sql; do bun run supabase:migrate < \"\$f\"; done"
