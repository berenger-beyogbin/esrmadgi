# MADGI ESR

Application de gestion de l’Épargne Santé Retraite : adhésions, cotisations, précomptes DGI, comptes individuels, prestations, paiements, documents et reporting CIMA.

## Démarrage local

Prérequis : Node.js 22 ou supérieur.

```powershell
npm ci
Copy-Item .env.example .env.local
Set-Location server
npm ci
Copy-Item .env.example .env
Set-Location ..
npm run dev:all
```

Cette commande lance ensemble le frontend sur `http://localhost:3000` et l'API
sur `http://localhost:4000`. Utilisez `Ctrl+C` pour arreter les deux services.

Le frontend utilise `VITE_API_BASE_URL`. L’API exige `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

## Vérification

```powershell
npm run lint
npm run build
Set-Location server
npm run lint
npm test
npm run build
npm audit --omit=dev
```

## Sauvegarde

```powershell
npm run backup:data
node scripts/verify-backup.mjs "tmp/backups/<dossier>"
```

Voir [Exploitation](docs/EXPLOITATION.md), [PRA](docs/PRA.md) et [Recette](docs/RECETTE.md).
