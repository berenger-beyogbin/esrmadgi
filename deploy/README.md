# Déploiement autonome MADGI ESR

Cette couche déploie le frontend, l'API et le proxy HTTPS. Elle se connecte au
réseau Docker du Compose officiel Supabase, installé séparément sur le même VPS.

## 1. Préparer le VPS

- Ubuntu Server 24.04 LTS, 8 Go de RAM minimum (16 Go recommandé).
- Installer Docker Engine et le plugin Docker Compose.
- N'autoriser dans le pare-feu que SSH, HTTP (80) et HTTPS (443).
- Créer trois enregistrements DNS pointant vers le VPS : application, API et
  Supabase. Ne pas publier PostgreSQL, Supabase Studio, Kong ou les ports Docker
  internes directement sur Internet.

## 2. Installer Supabase

Suivre la procédure Docker officielle :
https://supabase.com/docs/guides/self-hosting/docker

Configurer dans son `.env` les URL publiques HTTPS, les secrets générés, le SMTP
et les redirections Auth. Démarrer Supabase, puis noter le réseau Docker :

```sh
docker network ls
docker compose ps
```

La passerelle officielle Supabase `api-gw` doit être joignable depuis le réseau
Docker Supabase. Ne pas utiliser les clés de démonstration de la Supabase CLI
locale en production.

Pour administrer Studio sans l'exposer publiquement, lier son port à
`127.0.0.1` dans le Compose Supabase et ouvrir un tunnel SSH depuis le poste
d'administration.

## 3. Configurer l'application

Depuis la racine du dépôt :

```sh
cp deploy/production.example deploy/production.env
nano deploy/production.env
docker compose --env-file deploy/production.env -f compose.production.yml config
docker compose --env-file deploy/production.env -f compose.production.yml build
docker compose --env-file deploy/production.env -f compose.production.yml up -d
docker compose --env-file deploy/production.env -f compose.production.yml ps
```

Caddy demande automatiquement les certificats TLS après propagation des DNS.
Les variables `VITE_*` sont intégrées au frontend pendant le build : après une
modification de domaine ou de clé publique, reconstruire le service `web`.

## 4. Sauvegarder hors du VPS

Le script crée un dump PostgreSQL compressé et vérifiable :

```sh
sudo install -m 750 deploy/backup-postgres.sh /usr/local/sbin/madgi-esr-backup
sudo env SUPABASE_DB_CONTAINER=supabase-db \
  BACKUP_DIR=/var/backups/madgi-esr /usr/local/sbin/madgi-esr-backup
```

Adapter le nom du conteneur retourné par `docker compose ps`. Planifier ensuite
le script chaque nuit avec systemd/cron et synchroniser le répertoire vers un
stockage objet situé chez un autre fournisseur. Tester régulièrement une
restauration avec `pg_restore` sur une instance isolée.

## 5. Contrôles avant ouverture

```sh
curl -fsS "https://$APP_DOMAIN/health"
curl -fsS "https://$API_DOMAIN/api/health"
curl -fsS "https://$SUPABASE_DOMAIN/auth/v1/health"
docker compose --env-file deploy/production.env -f compose.production.yml logs --tail=100
```

Valider ensuite la connexion, un adhérent, une cotisation, une prestation, un
export et une restauration de sauvegarde avant d'importer les données finales.
