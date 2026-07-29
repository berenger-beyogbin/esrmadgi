# Plan de reprise d’activité

## Objectifs

- Perte de données maximale visée : 24 heures.
- Remise en service visée : 4 heures après disponibilité de l’infrastructure.

## Sauvegarde

Exécuter quotidiennement depuis la racine :

```powershell
npm run backup:data
node scripts/verify-backup.mjs "tmp/backups/<dossier-créé>"
```

Le manifeste contient la date, la source, le nombre de lignes et l’empreinte SHA-256 de chaque table. Une sauvegarde n’est valide que si la vérification retourne `"ok": true`.

Copier ensuite le dossier validé vers un stockage chiffré hors du serveur applicatif. Appliquer une rétention recommandée de 30 sauvegardes quotidiennes et 12 sauvegardes mensuelles.

## Reprise

1. Déclarer l’incident et suspendre les saisies.
2. Identifier la dernière sauvegarde validée.
3. Créer une instance PostgreSQL/Supabase de reprise.
4. Appliquer les migrations de `supabase/migrations` dans l’ordre.
5. Restaurer les tables en respectant les dépendances : référentiels, adhérents, bénéficiaires, cotisations, comptes, paiements, prestations, audit.
6. Comparer chaque nombre de lignes et empreinte avec le manifeste.
7. Configurer l’API sur l’instance restaurée.
8. Vérifier `/api/health/ready`, l’authentification, un compte ESR, un calcul de prestation et un export.
9. Faire valider la reprise par le responsable métier avant réouverture.

Le script fourni vérifie les sauvegardes ; la restauration destructive reste volontairement une procédure supervisée.

## Test périodique

Effectuer un exercice trimestriel sur une instance isolée. Consigner durée, anomalies, corrections et décision de validation dans le journal de recette.
