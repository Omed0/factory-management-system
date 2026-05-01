# scripts/setup.ps1 - Bootstrap Factory Management System (Windows)
#
# Usage:
#   .\scripts\setup.ps1              # interactive menu
#   .\scripts\setup.ps1 dev          # local development
#   .\scripts\setup.ps1 prod         # production setup (configures VPS + CF together)
#   .\scripts\setup.ps1 deploy-vps   # build Docker image with VITE vars, push to ghcr.io
#   .\scripts\setup.ps1 deploy-cf    # build CF Worker bundle, push secrets, deploy
#
# Also accepts: deploy:vps and deploy:cf as aliases for deploy-vps and deploy-cf.

param([string]$Mode = "")

$ErrorActionPreference = "Stop"

$REPO_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $REPO_ROOT

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
function Write-Info($msg)   { Write-Host "->  $msg" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "v   $msg" -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host "!   $msg" -ForegroundColor Yellow }
function Write-Header($msg) { Write-Host "`n-- $msg --" -ForegroundColor White }
function Stop-Script($msg)  { Write-Host "x   $msg" -ForegroundColor Red; exit 1 }

function Test-Requirement {
    param([string]$cmd, [string]$hint)
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Stop-Script "'$cmd' is required. $hint"
    }
}

# ---------------------------------------------------------------------------
# Random secret generators (pure .NET - no openssl needed on Windows)
# ---------------------------------------------------------------------------
function Get-RandHex {
    param([int]$byteCount)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $byteCount
    $rng.GetBytes($buf)
    return ([System.BitConverter]::ToString($buf) -replace '-', '').ToLower()
}

function Get-RandBase64 {
    param([int]$byteCount)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $buf = New-Object byte[] $byteCount
    $rng.GetBytes($buf)
    return [Convert]::ToBase64String($buf) -replace '[/+=]', ''
}

# ---------------------------------------------------------------------------
# .env helpers
# ---------------------------------------------------------------------------
function Set-EnvValue {
    param([string]$key, [string]$val)
    $content = Get-Content .env -Raw -Encoding utf8
    $content = $content -replace "(?m)^$([regex]::Escape($key))=.*", "$key=$val"
    Set-Content .env -Value $content -Encoding utf8 -NoNewline
}

function Import-EnvFile {
    if (-not (Test-Path .env)) { return }
    foreach ($line in (Get-Content .env)) {
        if ($line -match '^\s*([^#=][^=]*)=(.*)$') {
            $k = $matches[1].Trim()
            $v = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
        }
    }
}

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
function Test-Prerequisites {
    Write-Header "Checking prerequisites"
    Test-Requirement "bun"    "Install from: https://bun.sh/install"
    Test-Requirement "docker" "Install Docker Desktop: https://docs.docker.com/get-docker/"
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Stop-Script "Docker is not running - start Docker Desktop first."
    }
    $bunVer    = bun --version
    $dockerVer = (docker --version) -replace '.*?(\d+\.\d+\.\d+).*', '$1'
    Write-Ok "bun $bunVer  |  docker $dockerVer"
}

# ---------------------------------------------------------------------------
# JWT key generation
# ---------------------------------------------------------------------------
function New-JwtKeys {
    Write-Info "Generating JWT keys..."
    $jsCode = @'
const c = require('crypto');
const secret = c.randomBytes(48).toString('base64url');
const now = Math.floor(Date.now()/1000), exp = now + 10*365*24*3600;
const h = { alg:'HS256', typ:'JWT' };
const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = (p) => { const d=b(h)+'.'+b(p); return d+'.'+c.createHmac('sha256',secret).update(d).digest('base64url'); };
console.log(secret);
console.log(sign({role:'anon',iss:'supabase',iat:now,exp}));
console.log(sign({role:'service_role',iss:'supabase',iat:now,exp}));
'@
    $lines = (bun -e $jsCode) -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    $script:JWT_SECRET       = $lines[0]
    $script:ANON_KEY         = $lines[1]
    $script:SERVICE_ROLE_KEY = $lines[2]
    Write-Ok "JWT keys generated"
}

# ---------------------------------------------------------------------------
# Create .env from .env.example with generated secrets.
# Sets script-scoped variables: pgPass, dashPass (displayed by callers).
# ---------------------------------------------------------------------------
function New-EnvFile {
    if (-not (Test-Path .env.example)) { Stop-Script ".env.example not found at repo root." }
    Copy-Item .env.example .env

    New-JwtKeys

    $script:pgPass   = Get-RandBase64 18
    $script:dashPass = Get-RandBase64 16
    $secretBase      = Get-RandHex 32
    $vaultKey        = Get-RandHex 16
    $pgMetaKey       = Get-RandHex 16
    $logToken        = Get-RandHex 16

    Set-EnvValue "JWT_SECRET"                    $script:JWT_SECRET
    Set-EnvValue "ANON_KEY"                      $script:ANON_KEY
    Set-EnvValue "SERVICE_ROLE_KEY"              $script:SERVICE_ROLE_KEY
    Set-EnvValue "POSTGRES_PASSWORD"             $script:pgPass
    Set-EnvValue "DASHBOARD_PASSWORD"            $script:dashPass
    Set-EnvValue "SECRET_KEY_BASE"               $secretBase
    Set-EnvValue "VAULT_ENC_KEY"                 $vaultKey
    Set-EnvValue "PG_META_CRYPTO_KEY"            $pgMetaKey
    Set-EnvValue "LOGFLARE_PUBLIC_ACCESS_TOKEN"  $logToken
    Set-EnvValue "LOGFLARE_PRIVATE_ACCESS_TOKEN" $logToken
    # Duplicate key fields - dollar-brace expansion not supported in all runtimes
    Set-EnvValue "PUBLIC_SUPABASE_ANON_KEY"      $script:ANON_KEY
    Set-EnvValue "VITE_SUPABASE_ANON_KEY"        $script:ANON_KEY
    Set-EnvValue "SUPABASE_SERVICE_ROLE_KEY"     $script:SERVICE_ROLE_KEY
}

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
function Install-Deps {
    Write-Header "Installing dependencies"
    bun install
    if ($LASTEXITCODE -ne 0) { Stop-Script "bun install failed." }
    Write-Ok "Dependencies installed"
}

# ---------------------------------------------------------------------------
# Start Supabase via Docker Compose
# ---------------------------------------------------------------------------
function Start-Supabase {
    param([bool]$prod)
    Write-Header "Starting Supabase (Docker)"

    if ($prod) { bun run supabase:prod:up } else { bun run supabase:up }
    if ($LASTEXITCODE -ne 0) { Stop-Script "Failed to start Supabase containers." }

    Write-Host ""
    Write-Info "Waiting for containers to become healthy (up to 200s)..."
    Write-Info "(First run takes 30-90 seconds - containers are initialising)"
    Write-Host ""

    $tries    = 0
    $maxTries = 40
    while ($tries -lt $maxTries) {
        Start-Sleep 5
        $tries++

        $allStatuses = docker ps --filter "name=supabase" --format "{{.Names}}|{{.Status}}" 2>$null
        if (-not $allStatuses) {
            Write-Info "[$tries/$maxTries] No supabase containers visible yet..."
            continue
        }

        $lines     = @($allStatuses -split "`n" | Where-Object { $_ -ne "" })
        $total     = $lines.Count
        $healthy   = ($lines | Select-String "healthy").Count
        $starting  = ($lines | Select-String "starting|health: starting").Count
        $unhealthy = ($lines | Select-String "unhealthy").Count

        Write-Info "[$tries/$maxTries] $healthy healthy  |  $starting starting  |  $unhealthy unhealthy  (of $total containers)"

        if ($unhealthy -gt 0) {
            Write-Host ""
            Write-Warn "One or more containers are unhealthy. Check logs with:"
            Write-Warn "  docker compose -f supabase/docker-compose.yml logs --tail=50"
            break
        }

        if ($starting -eq 0 -and $total -gt 0) { break }
    }

    Write-Host ""
    docker ps --filter "name=supabase" --format "  {{.Names}}: {{.Status}}"
    Write-Host ""
    Write-Ok "Supabase is up"
}

# ---------------------------------------------------------------------------
# Apply SQL migrations
# ---------------------------------------------------------------------------
function Invoke-Migrations {
    Write-Header "Applying database migrations"

    $files = Get-ChildItem "supabase\migrations\*.sql" -ErrorAction SilentlyContinue | Sort-Object Name
    if ($files.Count -eq 0) {
        Write-Warn "No migration files found in supabase\migrations\"
        return
    }

    foreach ($f in $files) {
        Write-Info $f.Name
        # Pipe directly to docker exec - avoids stdin loss on Windows
        Get-Content $f.FullName -Raw -Encoding utf8 | docker exec -i supabase-db psql -U postgres -d postgres
        if ($LASTEXITCODE -ne 0) { Stop-Script "Migration failed: $($f.Name)" }
    }

    Write-Ok "$($files.Count) migration(s) applied"
}

# ===========================================================================
# MODE: dev
# ===========================================================================
function Start-DevSetup {
    Write-Host ""
    Write-Host "+===================================+" -ForegroundColor Cyan
    Write-Host "| DEV - Local Development Setup     |" -ForegroundColor Cyan
    Write-Host "+===================================+" -ForegroundColor Cyan

    Test-Prerequisites
    Install-Deps

    Write-Header "Environment (.env)"
    if (Test-Path .env) {
        Write-Warn ".env already exists - skipping generation. Edit manually if needed."
        Import-EnvFile
    } else {
        New-EnvFile
        Import-EnvFile
        Write-Ok ".env created for local development"
        Write-Host ""
        Write-Host "  Postgres password : " -NoNewline; Write-Host $script:pgPass   -ForegroundColor White
        Write-Host "  Studio password   : " -NoNewline; Write-Host $script:dashPass -ForegroundColor White
        Write-Host ""
        Write-Warn "Passwords above are in .env - do NOT commit that file."
    }

    Start-Supabase $false
    Invoke-Migrations

    Write-Host ""
    Write-Host "v  Dev environment ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Start : " -NoNewline; Write-Host "bun run dev"           -ForegroundColor White
    Write-Host "  Open  : " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor White
    Write-Host ""
    Write-Host "  First open -> setup wizard -> factory name, logo, colors, OWNER account."
    Write-Host ""
    Write-Host "  Daily : " -NoNewline; Write-Host "bun run supabase:up; bun run dev" -ForegroundColor White
    Write-Host ""
}

# ===========================================================================
# MODE: prod -- configure BOTH VPS and CF in one pass, then start Supabase
# ===========================================================================
function Start-ProdSetup {
    Write-Host ""
    Write-Host "+================================================+" -ForegroundColor Cyan
    Write-Host "| PROD - Production Setup (VPS + CF)             |" -ForegroundColor Cyan
    Write-Host "+================================================+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Configures .env for BOTH VPS Docker and Cloudflare Workers."
    Write-Host "  Run once on your server (or locally, then copy .env to the server)."
    Write-Host ""
    Write-Warn "Requires Docker. Run deploy/vps/harden.sh first on a fresh server."
    Write-Host ""
    $confirm = Read-Host "Continue? [y/N]"
    if ($confirm -notmatch '^[Yy]$') { Write-Info "Aborted."; exit 0 }

    Test-Prerequisites
    Install-Deps

    Write-Header "Environment (.env)"
    if (Test-Path .env) {
        Write-Warn ".env already exists - skipping generation. Edit manually if needed."
        Import-EnvFile
    } else {
        New-EnvFile

        Write-Host ""
        Write-Host "  Configure domains and deployment targets:"
        Write-Host ""
        $appDomain    = Read-Host "  App domain    (e.g. app.yourdomain.com)"
        $apiDomain    = Read-Host "  API domain    (e.g. api.yourdomain.com)"
        $studioDomain = Read-Host "  Studio domain (e.g. studio.yourdomain.com)"
        $ghOwner      = Read-Host "  GitHub owner  (for image pull, e.g. myorg)"
        $appTagInput  = Read-Host "  App Docker tag (leave blank for latest)"
        if ($appTagInput) { $appTag = $appTagInput } else { $appTag = "latest" }

        # VPS routing
        Set-EnvValue "SITE_URL"                 "https://$appDomain"
        Set-EnvValue "ADDITIONAL_REDIRECT_URLS" "https://$appDomain"
        Set-EnvValue "APP_DOMAIN"               $appDomain
        Set-EnvValue "API_DOMAIN"               $apiDomain
        Set-EnvValue "STUDIO_DOMAIN"            $studioDomain
        Set-EnvValue "GH_OWNER"                 $ghOwner
        Set-EnvValue "APP_TAG"                  $appTag

        # URL vars used by both VPS app container and CF Worker
        Set-EnvValue "API_EXTERNAL_URL"         "https://$apiDomain"
        Set-EnvValue "SUPABASE_PUBLIC_URL"      "https://$apiDomain"
        Set-EnvValue "PUBLIC_SUPABASE_URL"      "https://$apiDomain"
        Set-EnvValue "VITE_SUPABASE_URL"        "https://$apiDomain"

        # Internal Docker network URL for VPS app container only
        Set-EnvValue "SUPABASE_URL"             "http://kong:8000"

        # Caddy basic-auth hash for Studio access
        $studioPass = Get-RandBase64 14
        Write-Info "Generating Caddy password hash for Studio..."
        $studioHash = docker run --rm caddy:2-alpine caddy hash-password --plaintext $studioPass 2>$null
        if ($LASTEXITCODE -ne 0 -or -not $studioHash) {
            Write-Warn "Could not generate Caddy hash. Set STUDIO_PASS_HASH manually in .env."
            $studioHash = "REPLACE_WITH_CADDY_HASH"
        }
        Set-EnvValue "STUDIO_USER"      "admin"
        Set-EnvValue "STUDIO_PASS_HASH" $studioHash

        Import-EnvFile
        Write-Ok ".env created for production (VPS + CF)"
        Write-Host ""
        Write-Host "  App URL           : " -NoNewline; Write-Host "https://$appDomain" -ForegroundColor White
        Write-Host "  API URL           : " -NoNewline; Write-Host "https://$apiDomain" -ForegroundColor White
        Write-Host "  Postgres password : " -NoNewline; Write-Host $script:pgPass       -ForegroundColor White
        Write-Host "  Studio password   : " -NoNewline; Write-Host $studioPass          -ForegroundColor White
        Write-Host "  Dashboard password: " -NoNewline; Write-Host $script:dashPass     -ForegroundColor White
        Write-Host ""
        Write-Warn "Save these passwords - they will not be shown again."
    }

    Start-Supabase $true
    Invoke-Migrations

    Write-Host ""
    Write-Host "v  Production environment ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Supabase is running. Both VPS and CF deploy targets are configured."
    Write-Host ""
    Write-Host "  Deploy the app:"
    Write-Host "    VPS : " -NoNewline; Write-Host ".\scripts\setup.ps1 deploy-vps" -ForegroundColor White
    Write-Host "    CF  : " -NoNewline; Write-Host ".\scripts\setup.ps1 deploy-cf"  -ForegroundColor White
    Write-Host ""
    Write-Host "  To deploy both at once, run them sequentially:"
    Write-Host "    " -NoNewline
    Write-Host ".\scripts\setup.ps1 deploy-vps; .\scripts\setup.ps1 deploy-cf" -ForegroundColor White
    Write-Host ""
}

# ===========================================================================
# MODE: deploy-vps -- build Docker image with VITE vars baked in, push
# ===========================================================================
function Start-DeployVps {
    Write-Host ""
    Write-Host "+================================================+" -ForegroundColor Cyan
    Write-Host "| DEPLOY-VPS - Build and Push Docker Image       |" -ForegroundColor Cyan
    Write-Host "+================================================+" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Path .env)) { Stop-Script ".env not found. Run '.\scripts\setup.ps1 prod' first." }
    Import-EnvFile

    Test-Prerequisites

    $viteUrl  = [System.Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL",      "Process")
    $viteAnon = [System.Environment]::GetEnvironmentVariable("VITE_SUPABASE_ANON_KEY", "Process")
    $ghOwner  = [System.Environment]::GetEnvironmentVariable("GH_OWNER",               "Process")
    $appTag   = [System.Environment]::GetEnvironmentVariable("APP_TAG",                "Process")
    if (-not $appTag) { $appTag = "latest" }

    if (-not $viteUrl)  { Stop-Script "VITE_SUPABASE_URL is not set in .env. Run 'prod' setup first." }
    if (-not $viteAnon) { Stop-Script "VITE_SUPABASE_ANON_KEY is not set in .env. Run 'prod' setup first." }
    if (-not $ghOwner)  { Stop-Script "GH_OWNER is not set in .env. Run 'prod' setup first." }

    $image = "ghcr.io/$ghOwner/fms-app:$appTag"

    Write-Header "Building Docker image"
    Write-Info "Image : $image"
    Write-Info "Baking VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY into browser bundle..."

    docker build `
        --build-arg "VITE_SUPABASE_URL=$viteUrl" `
        --build-arg "VITE_SUPABASE_ANON_KEY=$viteAnon" `
        -t $image `
        .
    if ($LASTEXITCODE -ne 0) { Stop-Script "docker build failed." }
    Write-Ok "Build complete: $image"

    Write-Header "Pushing to GitHub Container Registry"
    Write-Warn "Make sure you are logged in: docker login ghcr.io -u <github-username>"
    docker push $image
    if ($LASTEXITCODE -ne 0) { Stop-Script "docker push failed." }
    Write-Ok "Pushed: $image"

    Write-Host ""
    Write-Host "v  VPS image pushed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  On your VPS, restart the app container:"
    Write-Host "    " -NoNewline
    Write-Host "docker compose -f supabase/docker-compose.prod.yml pull app" -ForegroundColor White
    Write-Host "    " -NoNewline
    Write-Host "docker compose -f supabase/docker-compose.prod.yml up -d app" -ForegroundColor White
    Write-Host ""
}

# ===========================================================================
# MODE: deploy-cf -- build CF Worker, push secrets, deploy via wrangler
# ===========================================================================
function Start-DeployCf {
    Write-Host ""
    Write-Host "+================================================+" -ForegroundColor Cyan
    Write-Host "| DEPLOY-CF - Cloudflare Workers Deployment      |" -ForegroundColor Cyan
    Write-Host "+================================================+" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Path .env)) { Stop-Script ".env not found. Run '.\scripts\setup.ps1 prod' first." }
    Import-EnvFile

    Test-Prerequisites
    Test-Requirement "wrangler" "Run: bun add -g wrangler"

    $viteUrl  = [System.Environment]::GetEnvironmentVariable("VITE_SUPABASE_URL",      "Process")
    $viteAnon = [System.Environment]::GetEnvironmentVariable("VITE_SUPABASE_ANON_KEY", "Process")

    if (-not $viteUrl)  { Stop-Script "VITE_SUPABASE_URL is not set in .env. Run 'prod' setup first." }
    if (-not $viteAnon) { Stop-Script "VITE_SUPABASE_ANON_KEY is not set in .env. Run 'prod' setup first." }

    Install-Deps

    Write-Header "Building for Cloudflare Workers"
    Write-Info "Baking VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY into browser bundle..."

    $env:DEPLOY_TARGET          = "cloudflare"
    $env:VITE_SUPABASE_URL      = $viteUrl
    $env:VITE_SUPABASE_ANON_KEY = $viteAnon
    bun run build
    if ($LASTEXITCODE -ne 0) { Stop-Script "CF build failed." }
    Write-Ok "CF build complete"

    $wranglerCfg = "deploy/cloudflare/wrangler.toml"
    $anonKey     = [System.Environment]::GetEnvironmentVariable("PUBLIC_SUPABASE_ANON_KEY",  "Process")
    $serviceKey  = [System.Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", "Process")
    $r2KeyId     = [System.Environment]::GetEnvironmentVariable("R2_ACCESS_KEY_ID",          "Process")
    $r2Secret    = [System.Environment]::GetEnvironmentVariable("R2_SECRET_ACCESS_KEY",      "Process")
    if (-not $anonKey) { $anonKey = $viteAnon }

    Write-Header "Pushing secrets to Cloudflare Worker"
    $anonKey    | wrangler secret put PUBLIC_SUPABASE_ANON_KEY  --config $wranglerCfg
    $serviceKey | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config $wranglerCfg

    if ($r2KeyId -and $r2KeyId -ne "" -and $r2KeyId -notmatch "replace-me") {
        $r2KeyId  | wrangler secret put R2_ACCESS_KEY_ID     --config $wranglerCfg
        $r2Secret | wrangler secret put R2_SECRET_ACCESS_KEY --config $wranglerCfg
        Write-Ok "R2 backup secrets set"
    } else {
        Write-Warn "R2 credentials not set - backups will not work until you add them to .env."
    }

    Write-Header "Deploying to Cloudflare Workers"
    bun run deploy:cf
    if ($LASTEXITCODE -ne 0) { Stop-Script "Cloudflare deploy failed." }
    Write-Ok "CF deploy complete"

    Write-Host ""
    Write-Host "v  Deployed to Cloudflare Workers!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Worker URL shown above."
    Write-Host "  To add a custom domain, edit 'routes' in deploy/cloudflare/wrangler.toml"
    Write-Host ""
    Write-Host "  Redeploy after code changes:"
    Write-Host "    " -NoNewline; Write-Host ".\scripts\setup.ps1 deploy-cf" -ForegroundColor White
    Write-Host ""
}

# ===========================================================================
# Entrypoint
# ===========================================================================
if (-not $Mode) {
    Write-Host ""
    Write-Host "Factory Management System - Setup" -ForegroundColor White
    Write-Host ""
    Write-Host "  1) dev        - Local development  (Docker backend + Vite dev server)"
    Write-Host "  2) prod       - Production setup   (configures VPS + CF together, starts Supabase)"
    Write-Host "  3) deploy-vps - Deploy to VPS      (build Docker image, push to ghcr.io)"
    Write-Host "  4) deploy-cf  - Deploy to CF       (build CF Worker, deploy via wrangler)"
    Write-Host ""
    $Mode = Read-Host "Choose [dev / prod / deploy-vps / deploy-cf]"
}

switch ($Mode.ToLower()) {
    "dev"        { Start-DevSetup  }
    "1"          { Start-DevSetup  }
    "prod"       { Start-ProdSetup }
    "2"          { Start-ProdSetup }
    "deploy-vps" { Start-DeployVps }
    "deploy:vps" { Start-DeployVps }
    "3"          { Start-DeployVps }
    "deploy-cf"  { Start-DeployCf  }
    "deploy:cf"  { Start-DeployCf  }
    "4"          { Start-DeployCf  }
    default      { Stop-Script "Unknown mode '$Mode'. Use: dev, prod, deploy-vps, or deploy-cf" }
}
