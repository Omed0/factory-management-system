# fix-passwords.ps1
# Resets all Supabase internal role passwords to match POSTGRES_PASSWORD in .env.
# Run when: you changed POSTGRES_PASSWORD in .env after the DB volumes were already initialized.
# Usage: bun db:fix-passwords

$envFile = Join-Path $PSScriptRoot "..\\.env"
if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

$password = $null
foreach ($line in Get-Content $envFile) {
    if ($line -match "^POSTGRES_PASSWORD=(.+)$") {
        $password = $Matches[1].Trim()
        break
    }
}

if (-not $password) {
    Write-Error "POSTGRES_PASSWORD not found in .env"
    exit 1
}

$running = docker ps --filter "name=supabase-db" --filter "status=running" --format "{{.Names}}" 2>$null
if ($running -notmatch "supabase-db") {
    Write-Error "supabase-db container is not running. Start it with: bun supabase:up"
    exit 1
}

Write-Host "Resetting Supabase role passwords..." -ForegroundColor Cyan

$sql = @"
ALTER USER authenticator WITH PASSWORD '$password';
ALTER USER pgbouncer WITH PASSWORD '$password';
ALTER USER supabase_auth_admin WITH PASSWORD '$password';
ALTER USER supabase_functions_admin WITH PASSWORD '$password';
ALTER USER supabase_storage_admin WITH PASSWORD '$password';
ALTER USER supabase_admin WITH PASSWORD '$password';
"@

$result = $sql | docker exec -i supabase-db sh -c "psql -U supabase_admin -h 127.0.0.1 postgres"
if ($LASTEXITCODE -eq 0) {
    Write-Host "All role passwords updated successfully." -ForegroundColor Green
} else {
    Write-Error "Failed to update passwords. Is supabase-db running?"
    exit 1
}
