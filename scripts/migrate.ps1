# Apply pending Supabase migrations using a schema_migrations tracking table.
# Safe to re-run: already-applied migrations are skipped.
# Usage: .\scripts\migrate.ps1
# Requires: Docker running with the supabase-db container.

param(
  [string]$Container = "supabase-db",
  [string]$DbUser    = "postgres",
  [string]$DbName    = "postgres"
)

function Invoke-Psql([string]$Sql) {
  $Sql | & docker exec -i $Container psql -U $DbUser -d $DbName -q
  return $LASTEXITCODE
}

function Query-Psql([string]$Sql) {
  $result = $Sql | & docker exec -i $Container psql -U $DbUser -d $DbName -t -A
  return $result
}

Write-Host "==> Bootstrapping schema_migrations table..."
$bootstrap = @'
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  filename   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
'@
$rc = Invoke-Psql $bootstrap
if ($rc -ne 0) {
  Write-Host "ERROR: Could not create schema_migrations table. Is the container running?" -ForegroundColor Red
  exit 1
}

# Get list of already-applied migrations
$appliedRaw = Query-Psql "SELECT filename FROM public.schema_migrations ORDER BY filename;"
$applied = @{}
foreach ($line in ($appliedRaw -split "`n")) {
  $f = $line.Trim()
  if ($f) { $applied[$f] = $true }
}

Write-Host "==> Found $($applied.Count) already-applied migration(s)."

$migDir = Join-Path $PSScriptRoot "..\supabase\migrations"
$files  = Get-ChildItem -Path $migDir -Filter "*.sql" | Sort-Object Name

$pending = 0
$ok      = 0
$failed  = 0

foreach ($file in $files) {
  $name = $file.Name
  if ($applied.ContainsKey($name)) {
    Write-Host "  skip  $name" -ForegroundColor DarkGray
    continue
  }

  $pending++
  Write-Host "  -->  apply $name" -ForegroundColor Cyan

  $content = Get-Content $file.FullName -Raw -Encoding UTF8
  # Wrap in a transaction; INSERT tracks the migration so re-runs skip it
  $wrapped = "BEGIN;`n$content`nINSERT INTO public.schema_migrations (filename) VALUES ('$name') ON CONFLICT DO NOTHING;`nCOMMIT;"

  $rc = Invoke-Psql $wrapped
  if ($rc -ne 0) {
    Write-Host "  FAILED: $name" -ForegroundColor Red
    $failed++
  } else {
    Write-Host "  done  $name" -ForegroundColor Green
    $ok++
  }
}

Write-Host ""
if ($pending -eq 0) {
  Write-Host "All migrations already applied -- nothing to do." -ForegroundColor Green
} else {
  Write-Host "Applied $ok/$pending migration(s)." -ForegroundColor $(if ($failed -gt 0) { "Yellow" } else { "Green" })
  if ($failed -gt 0) {
    Write-Host "$failed migration(s) failed. Check the output above." -ForegroundColor Red
    exit 1
  }
}
