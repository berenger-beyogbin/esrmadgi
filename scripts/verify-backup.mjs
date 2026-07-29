import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const backupDir = process.argv[2];
if (!backupDir) throw new Error('Usage: node scripts/verify-backup.mjs <dossier-backup>');

const manifest = JSON.parse(await readFile(path.join(backupDir, 'manifest.json'), 'utf8'));
const errors = [];
const datasets = new Map();
for (const table of manifest.tables) {
  if (table.status !== 'ok') {
    errors.push(`${table.table}: extraction en erreur`);
    continue;
  }
  const content = await readFile(path.join(backupDir, table.filename), 'utf8');
  const checksum = createHash('sha256').update(content).digest('hex');
  if (checksum !== table.sha256) errors.push(`${table.table}: checksum invalide`);
  const rows = JSON.parse(content);
  datasets.set(table.table, rows);
  if (!Array.isArray(rows) || rows.length !== table.rows) {
    errors.push(`${table.table}: nombre de lignes incohérent`);
  }
}

function verifierCleEtrangere(table, colonne, tableParent, cleParent, nullable = false) {
  const enfants = datasets.get(table) ?? [];
  const parents = new Set((datasets.get(tableParent) ?? []).map((row) => String(row[cleParent])));
  for (const row of enfants) {
    const valeur = row[colonne];
    if (nullable && (valeur == null || valeur === '')) continue;
    if (!parents.has(String(valeur))) {
      errors.push(`${table}.${colonne}: reference absente dans ${tableParent}.${cleParent} (${valeur})`);
    }
  }
}

verifierCleEtrangere('beneficiaires', 'id_adherent', 'adherents', 'id_adherent');
verifierCleEtrangere('info_cotisations', 'id_adherent', 'adherents', 'id_adherent');
verifierCleEtrangere('cotisation_entetes', 'id_adherent', 'adherents', 'id_adherent');
verifierCleEtrangere('cotisation_details', 'id_cotisation_entete', 'cotisation_entetes', 'id_cotisation_entete');
verifierCleEtrangere('precomptes', 'id_cotisation_detail', 'cotisation_details', 'id_cotisation_detail', true);
verifierCleEtrangere('paiements', 'id_adherent', 'adherents', 'id_adherent');
verifierCleEtrangere('prestations', 'id_adherent', 'adherents', 'id_adherent');
verifierCleEtrangere('rentes', 'id_adherent', 'adherents', 'id_adherent');
verifierCleEtrangere('rente_versements', 'id_rente', 'rentes', 'id_rente');
verifierCleEtrangere('comptes_esr', 'id_adherent', 'adherents', 'id_adherent');
if (errors.length > 0) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  tables: manifest.tables.length,
  relationsVerifiees: 10,
  createdAt: manifest.createdAt,
}, null, 2));
