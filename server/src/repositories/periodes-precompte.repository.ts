import { getSupabaseServer } from '../config/supabaseServer';
import { AppError } from '../middleware/errorHandler';
import { getTrimestreCourant } from '../utils/periode';

let resolvedTable: 'periodes' | 'periodes_precompte' | null = null;

async function getPeriodesTable(): Promise<'periodes' | 'periodes_precompte'> {
  if (resolvedTable) return resolvedTable;
  const supabase = getSupabaseServer();
  const { error } = await supabase.from('periodes').select('periode').limit(1);
  resolvedTable = error?.code === 'PGRST205' ? 'periodes_precompte' : 'periodes';
  return resolvedTable;
}

export interface PeriodeMetier {
  periode: string;
  annee: number;
  trimestre: number;
  statut: 'OUVERTE' | 'CLOTUREE';
  date_cloture: string | null;
  cloture_par: string | null;
  date_ouverture?: string | null;
  date_cloture_prevue?: string | null;
}

export interface ClotureSnapshot {
  id_adherent: number;
  capital_acquis: number;
  provision_mathematique: number;
  montant_cotise: number;
  interets_credites: number;
  valeur_rachat: number;
  taux_technique: number;
  date_valeur: string;
  version_calc: string;
}

export const periodesRepository = {
  async infrastructureClotureDisponible(): Promise<boolean> {
    const supabase = getSupabaseServer();
    const [resumeResult, lienResult] = await Promise.all([
      supabase.from('resumes_cloture_esr').select('periode').limit(1),
      supabase.from('cotisation_details').select('id_precompte').limit(1),
    ]);
    return !resumeResult.error && !lienResult.error;
  },

  async findAll(): Promise<PeriodeMetier[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(await getPeriodesTable())
      .select('*')
      .order('periode', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findOuvertes(): Promise<PeriodeMetier[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(await getPeriodesTable())
      .select('*')
      .eq('statut', 'OUVERTE')
      .order('periode', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findPeriodeEnCours(): Promise<PeriodeMetier | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(await getPeriodesTable())
      .select('*')
      .eq('statut', 'OUVERTE')
      .order('periode', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findByPeriode(periode: string): Promise<PeriodeMetier | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(await getPeriodesTable())
      .select('*')
      .eq('periode', periode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async upsertPeriodeCourante(): Promise<void> {
    const { annee, trimestre, periode } = getTrimestreCourant();
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from(await getPeriodesTable())
      .upsert(
        { periode, annee, trimestre, statut: 'OUVERTE' },
        { onConflict: 'periode', ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
  },

  async ensureOuverte(periode: string): Promise<PeriodeMetier> {
    const normalized = periode.trim().toUpperCase();
    const match = normalized.match(/^(\d{4})T([1-4])$/);
    if (!match) throw new AppError(400, 'Format de periode invalide. Attendu : 2026T2');

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from(await getPeriodesTable())
      .upsert(
        { periode: normalized, annee: Number(match[1]), trimestre: Number(match[2]), statut: 'OUVERTE' },
        { onConflict: 'periode', ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);

    const row = await this.findByPeriode(normalized);
    if (!row) throw new AppError(500, 'Impossible de creer la periode.');
    if (row.statut === 'CLOTUREE') {
      throw new AppError(409, `La periode ${normalized} est cloturee.`);
    }
    return row;
  },

  async create(annee: number, trimestre: number): Promise<PeriodeMetier> {
    const periode = `${annee}T${trimestre}`;
    const existing = await this.findByPeriode(periode);
    if (existing) throw new AppError(409, `La periode ${periode} existe deja.`);

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from(await getPeriodesTable())
      .insert({ periode, annee, trimestre, statut: 'OUVERTE' })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async cloturer(periode: string, userId: string): Promise<void> {
    const supabase = getSupabaseServer();
    const existing = await this.findByPeriode(periode);
    if (!existing) {
      throw new AppError(404, 'Periode introuvable.');
    }
    if (existing.statut === 'CLOTUREE') {
      throw new AppError(409, 'Cette periode est deja cloturee.');
    }
    const { error } = await supabase
      .from(await getPeriodesTable())
      .update({
        statut: 'CLOTUREE',
        date_cloture: new Date().toISOString(),
        cloture_par: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('periode', periode);
    if (error) throw new Error(error.message);
  },

  async getClotureData(periode: string): Promise<{
    adherents: any[];
    precomptes: any[];
    cotisations: any[];
    regularisations: any[];
  }> {
    const supabase = getSupabaseServer();
    const [adherentsResult, precomptesResult, cotisationsResult] = await Promise.all([
      supabase
        .from('v_adherents_complets')
        .select('*')
        .eq('statut', true)
        .eq('decede', false)
        .eq('retraite', false)
        .gt('cotisation_es', 0),
      supabase.from('v_precomptes_details').select('*').eq('periode', periode),
      supabase.from('v_cotisations_details').select('*').eq('periode', periode),
    ]);
    const error = adherentsResult.error ?? precomptesResult.error ?? cotisationsResult.error;
    if (error) throw new Error(error.message);
    let regularisations: any[] = [];
    const { data, error: regularisationsError } = await supabase
      .from('cotisation_details')
      .select('id_cotisation_detail,id_precompte,periode,date_valeur,montant,source,statut')
      .eq('source', 'REGULARISATION_PRECOMPTE')
      .eq('statut', 'ENCAISSEE');
    if (regularisationsError) {
      // Compatibilite transitoire avant application de la migration : les
      // anciennes regularisations n'avaient aucun lien persistant.
      if (['42703', 'PGRST204'].includes(String(regularisationsError.code))) {
        const [{ data: anciennes, error: anciennesError }, { data: tousPrecomptes, error: precomptesError }] = await Promise.all([
          supabase.from('v_cotisations_details').select('*').eq('source', 'SPONTANEE').eq('statut_detail', 'ENCAISSEE'),
          supabase.from('v_precomptes_details').select('*').in('statut_precompte', ['ENCAISSE', 'PARTIEL']),
        ]);
        const fallbackError = anciennesError ?? precomptesError;
        if (fallbackError) throw new Error(fallbackError.message);
        regularisations = (anciennes ?? []).flatMap((detail: any) => {
          const precompte = (tousPrecomptes ?? []).find((item: any) =>
            String(item.id_adherent) === String(detail.id_adherent)
            && Number(item.montant_retour) === Number(detail.montant)
            && String(item.date_retour ?? '') === String(detail.date_valeur ?? ''));
          return precompte ? [{ ...detail, id_precompte: precompte.id_precompte }] : [];
        });
      } else {
        throw new Error(regularisationsError.message);
      }
    } else {
      regularisations = data ?? [];
    }
    return {
      adherents: adherentsResult.data ?? [],
      precomptes: precomptesResult.data ?? [],
      cotisations: cotisationsResult.data ?? [],
      regularisations,
    };
  },

  async cloturerAtomiquement(input: {
    periode: string;
    userId: string;
    snapshots: ClotureSnapshot[];
    resume: { nb_adherents: number; capital_global: number; pm_totale: number; version_calc: string };
  }): Promise<{ periode_suivante: string }> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('cloturer_periode_esr', {
      p_periode: input.periode,
      p_user_id: input.userId,
      p_snapshots: input.snapshots,
      p_resume: input.resume,
    });
    if (error) throw new Error(error.message);
    return (data ?? {}) as { periode_suivante: string };
  },
};
