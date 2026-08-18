import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve('server/.env'), quiet: true });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configuration Supabase serveur manquante.');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const backupRoot = process.argv[2]
  ? path.resolve(process.argv[2], 'reset-scope')
  : path.resolve('tmp', 'backups', `reset-cotisations-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await mkdir(backupRoot, { recursive: true });

const targets = [
  ['imputations_paiements_spontanes', 'id_imputation'],
  ['paiements', 'id_paiement'],
  ['historique_actuariel_esr', 'id_historique'],
  ['historique_cotisations_esr', 'id_historique'],
  ['resumes_cloture_esr', 'id_resume'],
  ['precomptes', 'id_precompte'],
  ['cotisation_details', 'id_cotisation_detail'],
  ['cotisation_entetes', 'id_cotisation_entete'],
  ['periodes', 'periode'],
];

const available = [];
for (const [table, primaryKey] of targets) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    if (['42P01', 'PGRST205'].includes(String(error.code))) continue;
    throw new Error(`Sauvegarde ${table}: ${error.message}`);
  }
  try {
    await writeFile(path.join(backupRoot, `${table}.json`), JSON.stringify(data ?? [], null, 2), { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
  }
  available.push({ table, primaryKey, before: data?.length ?? 0 });
}

const deleted = [];
for (const { table, primaryKey, before } of available) {
  if (table === 'precomptes') {
    const { error: detachError } = await supabase
      .from('cotisation_details')
      .update({ id_precompte: null })
      .not('id_cotisation_detail', 'is', null);
    if (detachError) throw new Error(`Detachement cotisations/precomptes: ${detachError.message}`);
  }
  const { error } = await supabase.from(table).delete().not(primaryKey, 'is', null);
  if (error) throw new Error(`Suppression ${table}: ${error.message}`);
  deleted.push({ table, rows: before });
}

const { error: comptesError } = await supabase
  .from('comptes_esr')
  .update({
    capital_acquis: 0,
    pp: 0,
    pu: 0,
    pm: 0,
    valeur_rachat: 0,
    date_calcul: '2026-01-01',
    version_calc: 'RESET-TEST-2026T1',
    updated_at: new Date().toISOString(),
  })
  .not('id_compte_esr', 'is', null);
if (comptesError) throw new Error(`Remise a zero comptes ESR: ${comptesError.message}`);

const { data: periode, error: periodeError } = await supabase
  .from('periodes')
  .insert({
    periode: '2026T1',
    annee: 2026,
    trimestre: 1,
    statut: 'OUVERTE',
    date_ouverture: '2026-01-01',
    date_cloture_prevue: '2026-03-31',
    date_cloture: null,
    date_cloture_effective: null,
    cloture_par: null,
  })
  .select('*')
  .single();
if (periodeError) throw new Error(`Creation 2026T1: ${periodeError.message}`);

const verification = {};
for (const { table, primaryKey } of available) {
  const { count, error } = await supabase.from(table).select(primaryKey, { count: 'exact', head: true });
  if (error) throw new Error(`Verification ${table}: ${error.message}`);
  verification[table] = count ?? 0;
}

await writeFile(path.join(backupRoot, 'reset-result.json'), JSON.stringify({ deleted, periode, verification }, null, 2), 'utf8');
console.log(JSON.stringify({ backupRoot, deleted, periode, verification }, null, 2));
