<#
  MADGI ESR - Clonage de la base Supabase (prod) vers une stack Docker locale
  ------------------------------------------------------------------------
  Usage (depuis la racine du projet C:\PROJETS\madgi-esr) :
      powershell -ExecutionPolicy Bypass -File scripts\supabase-local-from-prod.ps1

  Ce script :
    1. Verifie que Docker Desktop tourne
    2. Initialise supabase/config.toml si absent (sans toucher aux migrations/functions existants)
    3. Relie le dossier au projet distant rvyhkjnyorlbgjojznqj (mot de passe DB demande)
    4. Demarre la stack Supabase locale dans Docker (Postgres/Auth/Storage/Studio...)
       -> applique automatiquement les migrations de supabase/migrations
    5. Exporte les DONNEES (schema public uniquement) du projet en ligne
    6. Importe ces donnees dans la base Postgres locale (conteneur Docker)
    7. Genere des fichiers d'env pretes a l'emploi pour pointer l'app sur le local :
         - .env.local                  (frontend, pris en compte automatiquement par Vite)
         - server\.env.docker.local    (backend, a copier manuellement sur server\.env quand tu veux tester en local)

  Rien n'est ecrase : server\.env et .env restent intacts et continuent de pointer vers la prod.
#>

$ErrorActionPreference = "Stop"
$ProjectRef = "rvyhkjnyorlbgjojznqj"

function Step($n, $label) {
  Write-Host ""
  Write-Host "== [$n/7] $label ==" -ForegroundColor Cyan
}

# 1) Docker
Step 1 "Verification de Docker Desktop"
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker Desktop ne repond pas. Lance l'appli Docker Desktop, attends qu'elle soit prete, puis relance ce script." -ForegroundColor Red
  exit 1
}
Write-Host "Docker OK." -ForegroundColor Green

# 2) Init config.toml si absent
Step 2 "Initialisation de la configuration Supabase locale"
if (-not (Test-Path "supabase/config.toml")) {
  npx --yes supabase init
} else {
  Write-Host "supabase/config.toml deja present, on continue." -ForegroundColor Yellow
}

# 3) Link vers le projet distant
Step 3 "Liaison avec le projet distant ($ProjectRef)"
Write-Host "Le mot de passe de la base de donnees va etre demande." -ForegroundColor Yellow
Write-Host "(Supabase Dashboard -> Project Settings -> Database -> Database password)" -ForegroundColor Yellow
npx --yes supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { Write-Host "Echec du lien avec le projet distant." -ForegroundColor Red; exit 1 }

# 4) Start de la stack locale
Step 4 "Demarrage de la stack Docker locale (peut prendre quelques minutes la 1ere fois)"
npx --yes supabase start
if ($LASTEXITCODE -ne 0) { Write-Host "Echec du demarrage de la stack locale." -ForegroundColor Red; exit 1 }

# 5) Dump des donnees de prod (schema public uniquement)
Step 5 "Export des donnees de production (schema public)"
New-Item -ItemType Directory -Force -Path "supabase" | Out-Null
npx --yes supabase db dump --linked --data-only --schema public -f supabase/seed_data.sql
if ($LASTEXITCODE -ne 0) { Write-Host "Echec de l'export des donnees." -ForegroundColor Red; exit 1 }
Write-Host "Donnees exportees dans supabase/seed_data.sql" -ForegroundColor Green

# 6) Import dans le conteneur Postgres local
Step 6 "Import des donnees dans la base Docker locale"
$dbContainer = (docker ps --filter "name=supabase_db" --format "{{.Names}}" | Select-Object -First 1)
if (-not $dbContainer) {
  Write-Host "Impossible de trouver le conteneur Postgres local (supabase_db_...). Verifie 'docker ps'." -ForegroundColor Red
  exit 1
}
Write-Host "Conteneur detecte : $dbContainer"
Get-Content supabase/seed_data.sql -Raw | docker exec -i $dbContainer psql -U postgres -d postgres
if ($LASTEXITCODE -ne 0) { Write-Host "Des erreurs se sont produites pendant l'import (voir ci-dessus)." -ForegroundColor Red; exit 1 }
Write-Host "Import termine." -ForegroundColor Green

# 7) Generation des fichiers d'environnement locaux
Step 7 "Generation des fichiers .env pour le mode local"
$rawStatus = (npx --yes supabase status -o json) -join "`n"
$jsonStart = $rawStatus.IndexOf('{')
$statusJson = $rawStatus.Substring($jsonStart) | ConvertFrom-Json

@"
VITE_API_BASE_URL=http://localhost:4000
VITE_SUPABASE_URL="$($statusJson.API_URL)"
VITE_SUPABASE_ANON_KEY="$($statusJson.ANON_KEY)"
"@ | Out-File -Encoding utf8 -FilePath ".env.local"

@"
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
FRONTEND_URLS=http://localhost:3000,http://localhost:3007,http://localhost:5173
ENABLE_DEMO_AUTH=false
TRUST_PROXY=false

SUPABASE_URL="$($statusJson.API_URL)"
SUPABASE_SERVICE_ROLE_KEY="$($statusJson.SERVICE_ROLE_KEY)"

# Complete si besoin avec le reste de server\.env (SMTP, SMS, MYSQL, SIAPS...)
"@ | Out-File -Encoding utf8 -FilePath "server/.env.docker.local"

Write-Host ""
Write-Host "Termine !" -ForegroundColor Green
Write-Host "Supabase Studio local : $($statusJson.STUDIO_URL)"
Write-Host "API locale            : $($statusJson.API_URL)"
Write-Host ""
Write-Host "Pour tester l'app sur la base locale :"
Write-Host "  - le frontend prend .env.local automatiquement (Vite)."
Write-Host "  - pour le backend, sauvegarde server\.env (ex: server\.env.prod.bak) puis copie server\.env.docker.local vers server\.env,"
Write-Host "    ensuite lance 'npm run dev:all'."
Write-Host "  - pour revenir a la prod, remets server\.env.prod.bak a la place."
