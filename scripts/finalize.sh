#!/usr/bin/env bash
# Phase 7 — finalize the rewrite.
#
#   * Deletes the legacy Next.js + Prisma + MySQL code at the repo root
#   * Moves v2/* up to the repo root
#   * Removes the now-redundant v2/ folder
#
# Run ONLY after you've smoke-tested the new app end-to-end:
#   1. ./v2/supabase/bootstrap.sh succeeded
#   2. docker compose up -d brought all services healthy
#   3. supabase db push applied without errors
#   4. cd v2/app && npm install && npx shadcn@latest add ... && npm run dev
#   5. http://localhost:3000 reaches /setup, you completed the wizard
#   6. You logged in as the OWNER you just created
#   7. You verified each module loads: dashboard, sales, customers, products,
#      employees, expenses, companies, purchases, dollar, reports, settings
#
# Reversible until you commit. After running this, commit the result.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [ ! -d v2 ]; then
  echo "✗ v2/ does not exist. Are you running this from the right repo?"
  exit 1
fi

if [ ! -f v2/app/package.json ] || [ ! -f v2/supabase/migrations/20260425000001_initial_schema.sql ]; then
  echo "✗ v2/ does not look complete. Aborting."
  exit 1
fi

echo "=> About to delete legacy code and promote v2/ to repo root."
echo "   The following paths will be removed:"
LEGACY=(
  src
  server
  prisma
  public
  .next
  next.config.mjs
  package.json
  package-lock.json
  tailwind.config.ts
  postcss.config.cjs
  components.json
  copy-assets.js
  loader.js
  moveBuildFolder.bat
  .eslintrc.js
  .prettierrc.js
  .prettierignore
  tsconfig.json
)
for p in "${LEGACY[@]}"; do
  [ -e "$p" ] && echo "   - $p"
done

read -p "Type 'yes' to proceed: " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# 1. Remove legacy
for p in "${LEGACY[@]}"; do
  if [ -e "$p" ]; then
    echo "rm -rf $p"
    rm -rf "$p"
  fi
done

# 2. Move v2/* to root (excluding scripts/finalize.sh which is running)
shopt -s dotglob nullglob
for entry in v2/*; do
  base="$(basename "$entry")"
  if [ "$base" = "scripts" ]; then
    # Promote everything inside scripts/ except this very script
    mkdir -p ./scripts
    for s in v2/scripts/*; do
      [ "$(basename "$s")" = "finalize.sh" ] && continue
      mv "$s" ./scripts/
    done
    continue
  fi
  if [ -e "./$base" ]; then
    echo "✗ ./$base already exists at repo root — aborting to avoid clobber"
    exit 1
  fi
  mv "$entry" ./
done

# 3. Drop v2/
rm -rf v2

# 4. Update CLAUDE.md to drop the "two codebases" preamble
if [ -f CLAUDE.md ]; then
  sed -i.bak '/^## Repo state — there are TWO codebases right now/,/^## What this app is/{//!d;}' CLAUDE.md
  rm -f CLAUDE.md.bak
fi

echo
echo "✓ Phase 7 complete."
echo
echo "Next:"
echo "  git add -A"
echo "  git commit -m 'Phase 7: remove legacy Next.js stack, promote v2 to root'"
echo
echo "Recommended: re-run typecheck + a quick smoke test against the new layout."
