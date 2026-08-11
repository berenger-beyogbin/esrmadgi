import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve('server/.env') });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const periode = '2026T1';
const dateArrete = '2026-03-31';
const dateTest = '2026-03-30';

const { data: lignes, error: lignesError } = await supabase
  .from('cotisation_details')
  .select('id_cotisation_detail,id_precompte,date_valeur,montant')
  .eq('periode', periode)
  .eq('source', 'REGULARISATION_PRECOMPTE')
  .eq('statut', 'ENCAISSEE')
  .gt('date_valeur', dateArrete);
if (lignesError) throw lignesError;

for (const ligne of lignes ?? []) {
  const { error: detailError } = await supabase
    .from('cotisation_details')
    .update({ date_valeur: dateTest })
    .eq('id_cotisation_detail', ligne.id_cotisation_detail);
  if (detailError) throw detailError;

  if (ligne.id_precompte) {
    const { error: precompteError } = await supabase
      .from('precomptes')
      .update({ date_retour: dateTest })
      .eq('id_precompte', ligne.id_precompte);
    if (precompteError) throw precompteError;
  }
}

console.log(JSON.stringify({
  periode,
  dateTest,
  paiementsModifies: (lignes ?? []).map((ligne) => ligne.id_cotisation_detail),
}));
