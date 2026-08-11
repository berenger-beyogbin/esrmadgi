import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve('server/.env') });
const periode = process.argv[2]?.trim().toUpperCase();
if (!/^\d{4}T[1-4]$/.test(periode ?? '')) throw new Error('Période invalide.');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const count = async (table, column = 'periode') => {
  const result = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(column, periode);
  if (result.error) return { count: null, error: result.error.message };
  return { count: result.count ?? 0, error: null };
};

const { data: periodeRow, error: periodeError } = await supabase
  .from('periodes')
  .select('*')
  .eq('periode', periode)
  .maybeSingle();
if (periodeError) throw periodeError;

const [precomptes, cotisations, historiques] = await Promise.all([
  count('precomptes'),
  count('cotisation_details'),
  count('historique_cotisations_esr'),
]);

console.log(JSON.stringify({ periode: periodeRow, precomptes, cotisations, historiques }));
