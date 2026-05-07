# Generate TypeScript types from the live Supabase database.
# Usage: .\scripts\gen-types.ps1
# Requires: Supabase dev stack running (bun run supabase:up).
#
# Uses the postgres-meta REST API that is already running inside the Docker
# network (supabase-meta:8080) — no extra Docker pull needed.

$root = [IO.Path]::GetFullPath([IO.Path]::Combine($PSScriptRoot, '..'))
$out  = [IO.Path]::Combine($root, 'src', 'lib', 'database.types.ts')

Write-Host "==> Generating types via supabase-meta..."
$types = docker exec supabase-db curl -s "http://meta:8080/generators/typescript?included_schemas=public" 2>&1
if ($LASTEXITCODE -ne 0 -or -not ($types -join '' -match 'export type')) {
  Write-Host "ERROR: Could not reach supabase-meta. Is the Supabase stack running?" -ForegroundColor Red
  Write-Host "Run: bun run supabase:up" -ForegroundColor Yellow
  exit 1
}
$types | Set-Content $out -Encoding utf8
Write-Host "==> Written to src/lib/database.types.ts" -ForegroundColor Green
