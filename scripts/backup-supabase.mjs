import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: 'server/.env', quiet: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configuration Supabase serveur manquante.');

const supabase = createClient(url, key, { auth: { persistSession: false } });
const tables = [
  'adherents', 'beneficiaires', 'info_cotisations', 'cotisation_entetes',
  'cotisation_details', 'precomptes', 'paiements', 'prestations', 'rentes',
  'rente_versements', 'comptes_esr', 'parametres_generaux', 'grades',
  'mortalite', 'audit_logs',
];
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.resolve('tmp', 'backups', `madgi-esr-${stamp}`);
await mkdir(outputDir, { recursive: true });

const manifest = {
  createdAt: new Date().toISOString(),
  source: new URL(url).hostname,
  tables: [],
};

for (const table of tables) {
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' });
  if (error) {
    manifest.tables.push({ table, status: 'error', error: error.message });
    continue;
  }
  const content = JSON.stringify(data ?? [], null, 2);
  const filename = `${table}.json`;
  await writeFile(path.join(outputDir, filename), content, 'utf8');
  manifest.tables.push({
    table,
    status: 'ok',
    rows: count ?? data?.length ?? 0,
    filename,
    sha256: createHash('sha256').update(content).digest('hex'),
  });
}
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify({ outputDir, manifest }, null, 2));
