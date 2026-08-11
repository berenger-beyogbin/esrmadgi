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

const { data: adherents, error: adherentsError } = await supabase
  .from('adherents')
  .select('id_adherent,adhesion_en_ligne,statut,etat');
if (adherentsError) throw adherentsError;

const { data: comptes, error: comptesError } = await supabase
  .from('comptes_esr')
  .select('id_adherent');
if (comptesError) throw comptesError;

const comptesExistants = new Set((comptes ?? []).map((row) => String(row.id_adherent)));
const adherentsEligibles = (adherents ?? []).filter((row) => (
  row.adhesion_en_ligne !== true
  || (row.statut === true && String(row.etat || 'ACTIF').toUpperCase() !== 'REJETE')
));
const adherentsSansCompte = adherentsEligibles.filter(
  (row) => !comptesExistants.has(String(row.id_adherent)),
);

if (adherentsSansCompte.length > 0) {
  const dateCalcul = new Date().toISOString().slice(0, 10);
  const { error: insertionError } = await supabase.from('comptes_esr').insert(
    adherentsSansCompte.map((row) => ({
      id_adherent: row.id_adherent,
      capital_acquis: 0,
      pp: 0,
      pu: 0,
      pm: 0,
      valeur_rachat: 0,
      date_calcul: dateCalcul,
      version_calc: 'V1',
    })),
  );
  if (insertionError) throw insertionError;
}

const { count, error: verificationError } = await supabase
  .from('comptes_esr')
  .select('*', { count: 'exact', head: true });
if (verificationError) throw verificationError;

console.log(JSON.stringify({
  adherentsEligibles: adherentsEligibles.length,
  comptesExistantsAvant: comptesExistants.size,
  comptesCrees: adherentsSansCompte.length,
  comptesApres: count,
}));
