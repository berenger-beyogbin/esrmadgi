import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.admin.local', override: true });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  throw new Error('Configuration Supabase administrateur manquante.');
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seeds = [
  ['FRAIS_GESTION_RACHAT', 'Frais de gestion sur rachat', '5',
    'Valeur provisoire en pourcentage, distincte de la pénalité de rachat.'],
  ['TAUX_DECES_AVANT_RETRAITE', 'Part versée en cas de décès avant retraite', '95',
    'Valeur provisoire en pourcentage de la valeur acquise du compte ESR.'],
  ['TAUX_INVALIDITE_AVANT_RETRAITE', "Part versée en cas d'invalidité totale avant retraite", '95',
    'Valeur provisoire en pourcentage de la valeur acquise du compte ESR.'],
  ['TAUX_COUVERTURE_RETRAITE', 'Part de la cotisation maladie financée à la retraite', '100',
    'Valeur provisoire, distincte du taux de remboursement des soins.'],
  ['TAUX_REMBOURSEMENT_SOINS', 'Taux de remboursement des soins', '80',
    'Valeur provisoire ; ne pas confondre avec le financement de la cotisation.'],
  ['TAUX_DECES_PENDANT_RENTE', 'Part du capital restant versée en cas de décès pendant rente', '80',
    'Valeur provisoire en pourcentage du capital constitutif restant dû.'],
  ['DELAI_MIN_RACHAT_ANNEES', 'Ancienneté minimale avant rachat total', '2',
    'Valeur provisoire exprimée en années complètes de cotisation.'],
];

const codes = seeds.map(([code]) => code);
const { data: existing, error: selectError } = await supabase
  .from('parametres_generaux')
  .select('code')
  .in('code', codes);

if (selectError) throw selectError;

const existingCodes = new Set((existing ?? []).map((item) => item.code));
const missing = seeds
  .filter(([code]) => !existingCodes.has(code))
  .map(([code, libelle, valeur, description]) => ({
    code,
    libelle,
    valeur,
    description,
    actif: true,
    date_debut: '2024-01-01',
  }));

if (missing.length > 0) {
  const { error: insertError } = await supabase.from('parametres_generaux').insert(missing);
  if (insertError) throw insertError;
}

const { data: verification, error: verificationError } = await supabase
  .from('parametres_generaux')
  .select('code,valeur,actif,date_debut')
  .in('code', codes)
  .order('code');

if (verificationError) throw verificationError;
console.log(JSON.stringify({ inserted: missing.length, parameters: verification }, null, 2));
