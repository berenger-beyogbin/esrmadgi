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

const detailId = 62;
const periodeSource = '2026T3';
const periodeCible = '2026T1';

const { data: detail, error: detailError } = await supabase
  .from('cotisation_details')
  .select('id_cotisation_detail,id_cotisation_entete,id_precompte,periode,source,montant')
  .eq('id_cotisation_detail', detailId)
  .single();
if (detailError) throw detailError;
if (detail.periode !== periodeSource || detail.source !== 'REGULARISATION_PRECOMPTE') {
  throw new Error('La cotisation ciblée ne correspond pas à la régularisation attendue.');
}

const { data: precompte, error: precompteError } = await supabase
  .from('precomptes')
  .select('id_precompte,periode,matricule')
  .eq('id_precompte', detail.id_precompte)
  .single();
if (precompteError) throw precompteError;
if (precompte.periode !== periodeCible) {
  throw new Error(`Le précompte associé appartient à ${precompte.periode}, pas à ${periodeCible}.`);
}

const { error: updateDetailError } = await supabase
  .from('cotisation_details')
  .update({ periode: periodeCible })
  .eq('id_cotisation_detail', detailId);
if (updateDetailError) throw updateDetailError;

const { data: entete, error: enteteError } = await supabase
  .from('cotisation_entetes')
  .select('reference')
  .eq('id_cotisation_entete', detail.id_cotisation_entete)
  .single();
if (enteteError) throw enteteError;

const { error: updateEnteteError } = await supabase
  .from('cotisation_entetes')
  .update({
    periode_deb: '2026-01-01',
    periode_fin: '2026-03-31',
    reference: String(entete.reference ?? '').replace('26T3', '26T1'),
  })
  .eq('id_cotisation_entete', detail.id_cotisation_entete);
if (updateEnteteError) throw updateEnteteError;

const tables = ['precomptes', 'cotisation_details', 'historique_cotisations_esr'];
for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('periode', periodeSource);
  if (error) throw error;
  if ((count ?? 0) > 0) throw new Error(`${periodeSource} contient encore ${count} ligne(s) dans ${table}.`);
}

const { error: deleteError } = await supabase.from('periodes').delete().eq('periode', periodeSource);
if (deleteError) throw deleteError;

console.log(JSON.stringify({
  cotisation: detailId,
  matricule: precompte.matricule,
  anciennePeriode: periodeSource,
  nouvellePeriode: periodeCible,
  periodeSupprimee: periodeSource,
}));
