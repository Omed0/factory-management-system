#!/usr/bin/env bash
# Apply pending Supabase migrations using a schema_migrations tracking table.
# Safe to re-run: already-applied migrations are skipped.
# Usage: bash scripts/migrate.sh
# Requires: Docker running with the supabase-db container.

set -euo pipefail

CONTAINER="${SUPABASE_CONTAINER:-supabase-db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-postgres}"
MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

psql() { docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" "$@"; }
query() { docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" 2>/dev/null; }

echo "==> Bootstrapping schema_migrations table..."
psql -q <<'SQL'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

# Build an associative array of already-applied migrations
declare -A applied
while IFS= read -r line; do
  [[ -n "$line" ]] && applied["$line"]=1
done < <(query "SELECT filename FROM public.schema_migrations ORDER BY filename;")

echo "==> Found ${#applied[@]} already-applied migration(s)."

pending=0 ok=0 failed=0

for file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  name=$(basename "$file")
  if [[ -v applied["$name"] ]]; then
    printf "  \e[90m⏭  skip  %s\e[0m\n" "$name"
    continue
  fi

  pending=$((pending + 1))
  printf "  \e[36m-->  apply %s\e[0m\n" "$name"

  # Wrap in a transaction so a failure rolls back cleanly
  if psql -q -v ON_ERROR_STOP=1 <<SQL
BEGIN;
$(cat "$file")
INSERT INTO public.schema_migrations (filename) VALUES ('$name') ON CONFLICT DO NOTHING;
COMMIT;
SQL
  then
    printf "  \e[32m✓  done  %s\e[0m\n" "$name"
    ok=$((ok + 1))
  else
    printf "  \e[31mFAILED: %s\e[0m\n" "$name"
    failed=$((failed + 1))
  fi
done

echo ""
if [[ $pending -eq 0 ]]; then
  echo -e "\e[32mAll migrations already applied — nothing to do.\e[0m"
elif [[ $failed -gt 0 ]]; then
  echo -e "\e[33mApplied $ok/$pending migration(s). $failed failed.\e[0m"
  exit 1
else
  echo -e "\e[32mApplied $ok/$pending migration(s) successfully.\e[0m"
fi
