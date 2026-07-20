# MADGI ESR — API Backend

API Node.js / Express / TypeScript qui sert d'intermédiaire entre le frontend React et les sources de données (Supabase actuellement, MySQL/PostgreSQL à terme).

---

## Démarrage rapide

### 1. Installer les dépendances

```bash
cd server
npm install
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
# Éditer server/.env avec les vraies valeurs
```

Variables minimales requises :

```
PORT=4000
NODE_ENV=production
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ENABLE_DEMO_AUTH=false
```

Variables optionnelles (search-by-matricule) :

```
MYSQL_HOST=...
MYSQL_USER=...
MYSQL_PASSWORD=...
MYSQL_DATABASE=...
SIAPS_BASE_URL=...
SIAPS_EMAIL=...
SIAPS_PASSWORD=...
```

**Ne jamais commiter `server/.env` — il est dans `.gitignore`.**

### 3. Lancer en développement

```bash
npm run dev
```

L'API démarre sur `http://localhost:4000`. Le script `dev` active explicitement `NODE_ENV=development` et `ENABLE_DEMO_AUTH=true` pour les comptes de demonstration locaux.

### Production

```bash
npm run build
npm start
```

Le script `start` force `NODE_ENV=production`. Si l'hebergeur lance directement `node dist/index.js`, definir imperativement `NODE_ENV=production` et garder `ENABLE_DEMO_AUTH=false`.

---

## Endpoints disponibles

### GET /api/health

Test de disponibilité.

```bash
curl http://localhost:4000/api/health
```

Réponse :
```json
{
  "ok": true,
  "service": "MADGI ESR API",
  "timestamp": "2026-06-17T10:00:00.000Z"
}
```

---

### POST /api/agents/search-by-matricule

Recherche un agent dans la base MySQL externe ou l'API SIAPS.

```bash
curl -X POST http://localhost:4000/api/agents/search-by-matricule \
  -H "Content-Type: application/json" \
  -d '{"matricule": "M80321"}'
```

Réponse — agent trouvé :
```json
{
  "found": true,
  "data": {
    "matricule": "M80321",
    "nom": "KOUASSI",
    "prenoms": "JEAN",
    "date_naissance": "1980-04-12",
    "source": "MYSQL"
  },
  "error": null
}
```

Réponse — introuvable :
```json
{ "found": false, "data": null, "error": null }
```

Logique de fallback :
1. Essaie MySQL si `MYSQL_HOST` est configuré.
2. Si introuvable ou MySQL absent, essaie SIAPS si `SIAPS_BASE_URL` est configuré.
3. Si aucune source n'est configurée, retourne `found: false` sans erreur.

---

### GET /api/adherents

Liste tous les adhérents depuis Supabase (via service role).

```bash
curl "http://localhost:4000/api/adherents?statut=ACTIF&search=KONE"
```

Paramètres query optionnels :
- `statut` : `ACTIF`, `RETRAITE`, `DECEDE`, `INACTIF`, `TOUS`
- `search` : filtre sur matricule, nom, prénoms

Réponse :
```json
{ "data": [...], "error": null }
```

---

## Architecture

```
server/
├── src/
│   ├── index.ts                    # Point d'entrée Express
│   ├── types.ts                    # Types partagés backend
│   ├── config/
│   │   ├── env.ts                  # Chargement .env + validation
│   │   └── supabaseServer.ts       # Client Supabase service role (lazy)
│   ├── middleware/
│   │   ├── errorHandler.ts         # Gestion globale des erreurs
│   │   └── requestLogger.ts        # Log des requêtes en dev
│   ├── routes/
│   │   ├── health.routes.ts
│   │   ├── agents.routes.ts
│   │   └── adherents.routes.ts
│   ├── controllers/
│   │   ├── agents.controller.ts    # Validation zod + appel service
│   │   └── adherents.controller.ts
│   ├── services/
│   │   ├── agents.service.ts       # Logique métier + fallback
│   │   └── adherents.service.ts
│   └── repositories/
│       ├── agents.repository.ts    # Accès MySQL + SIAPS
│       └── adherents.repository.ts # Accès Supabase
```

---

## Stratégie de migration hors Supabase

### Situation actuelle

```
React frontend
  → API backend (server/)   ← CETTE COUCHE
      → Supabase (PostgreSQL managé)
      → MySQL externe (agents uniquement)
```

Le frontend appelle l'API backend pour les opérations migrées. Supabase est lu côté serveur uniquement, avec la `SERVICE_ROLE_KEY` qui n'est jamais exposée au navigateur.

### Principe de migration progressive

La couche **repository** est le seul endroit où la source de données est référencée. Pour migrer une entité de Supabase vers MySQL/PostgreSQL :

1. Créer un nouveau repository (ex : `adherents.mysql.repository.ts`)
2. Implémenter la même interface que le repository Supabase existant
3. Mettre à jour le service pour utiliser le nouveau repository
4. Le controller et les routes ne changent pas
5. Le frontend ne change pas

### Ordre de migration recommandé

| Priorité | Module | Complexité |
|---|---|---|
| 1 | Auth | Haute (sessions, JWT) |
| 2 | Adhérents | Moyenne (CRUD + RPC) |
| 3 | Bénéficiaires | Faible |
| 4 | Paramètres | Faible |
| 5 | Cotisations | Moyenne |
| 6 | Précomptes | Moyenne |
| 7 | Prestations | Haute |
| 8 | Dashboard | Faible (vues agrégées) |

### Ce que le frontend doit faire

Remplacer les appels directs Supabase par des appels à l'API backend :

```typescript
// Avant (direct Supabase)
const { data } = await supabase.from('v_adherents_complets').select('*');

// Après (via API backend)
const { data } = await apiClient.get('/api/adherents');
```

Le `apiClient` frontend (`src/lib/apiClient.ts`) est déjà en place pour cela.

### Checklist avant migration d'un module

- [ ] Route API créée et testée
- [ ] Repository Supabase isolé (ne pas mélanger logique dans le controller)
- [ ] Tests manuels endpoint OK
- [ ] Frontend service mis à jour pour appeler l'API
- [ ] Supabase direct supprimé du service frontend concerné
- [ ] lint + build OK
