#!/usr/bin/env sh
set -eu

: "${SUPABASE_DB_CONTAINER:?Definir SUPABASE_DB_CONTAINER, par exemple supabase-db}"
: "${BACKUP_DIR:?Definir BACKUP_DIR, par exemple /var/backups/madgi-esr}"

umask 077
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/madgi-esr-$timestamp.dump"

docker exec "$SUPABASE_DB_CONTAINER" pg_dump \
  --username postgres \
  --dbname postgres \
  --format custom \
  --no-owner \
  --no-privileges > "$target"

gzip "$target"
sha256sum "$target.gz" > "$target.gz.sha256"
find "$BACKUP_DIR" -type f -name 'madgi-esr-*.dump.gz*' -mtime +30 -delete

printf 'Sauvegarde creee : %s\n' "$target.gz"
