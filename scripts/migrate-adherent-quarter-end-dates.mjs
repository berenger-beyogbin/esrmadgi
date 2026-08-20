import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: 'server/.env', quiet: true });

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Configuration Supabase serveur manquante.');

const supabase = createClient(url, key, { auth: { persistSession: false } });

function parseIso(value) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return { year, month };
}

function quarterEnd(value) {
  const parsed = parseIso(value);
  if (!parsed) return null;
  const quarter = Math.floor((parsed.month - 1) / 3) + 1;
  const ends = ['03-31', '06-30', '09-30', '12-31'];
  return `${parsed.year}-${ends[quarter - 1]}`;
}

function dayAfter(value) {
  const iso = String(value ?? '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

const { data, error } = await supabase
  .from('info_cotisations')
  .select('id_info_cotisation,id_adherent,date_precompte,date_effet')
  .not('date_precompte', 'is', null)
  .order('id_info_cotisation');
if (error) throw new Error(error.message);

const invalides = [];
const changements = [];
for (const row of data ?? []) {
  const datePrecompte = quarterEnd(row.date_precompte);
  const dateEffet = dayAfter(datePrecompte);
  if (!datePrecompte || !dateEffet) {
    invalides.push(row);
    continue;
  }
  if (row.date_precompte !== datePrecompte || row.date_effet !== dateEffet) {
    changements.push({
      id_info_cotisation: row.id_info_cotisation,
      id_adherent: row.id_adherent,
      avant: { date_precompte: row.date_precompte, date_effet: row.date_effet },
      apres: { date_precompte: datePrecompte, date_effet: dateEffet },
    });
  }
}

if (!apply) {
  console.log(JSON.stringify({ mode: 'DRY_RUN', total: data?.length ?? 0, changements, invalides }, null, 2));
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('tmp', 'backups');
  await mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `info-cotisations-dates-${stamp}.json`);
  await writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows: data ?? [] }, null, 2), 'utf8');

  for (const changement of changements) {
    const { error: updateError } = await supabase
      .from('info_cotisations')
      .update({ ...changement.apres, updated_at: new Date().toISOString() })
      .eq('id_info_cotisation', changement.id_info_cotisation);
    if (updateError) throw new Error(`Mise à jour ${changement.id_info_cotisation}: ${updateError.message}`);
  }

  const ids = changements.map((item) => item.id_info_cotisation);
  let verifies = [];
  if (ids.length > 0) {
    const { data: verification, error: verificationError } = await supabase
      .from('info_cotisations')
      .select('id_info_cotisation,id_adherent,date_precompte,date_effet')
      .in('id_info_cotisation', ids);
    if (verificationError) throw new Error(verificationError.message);
    verifies = verification ?? [];
  }

  const nonConformes = verifies.filter((row) =>
    row.date_precompte !== quarterEnd(row.date_precompte)
    || row.date_effet !== dayAfter(row.date_precompte));

  console.log(JSON.stringify({
    mode: 'APPLY',
    backupPath,
    updated: changements.length,
    verified: verifies.length,
    invalides: invalides.length,
    nonConformes,
  }, null, 2));

  if (nonConformes.length > 0) process.exitCode = 1;
}
