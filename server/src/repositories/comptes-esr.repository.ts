import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface CompteEsrFilters {
  search?: string;
  matricule?: string;
}

export interface CompteCapitalInputRow {
  id_adherent: number | string;
  age_retraite?: number | string | null;
  cotisation_annuelle?: number | string | null;
  taux_gar?: number | string | null;
  frais_rente?: number | string | null;
}

export const comptesEsrRepository = {
  async actualiserRepartition(adherentId: string): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase.rpc('actualiser_pp_pu_compte_esr', {
      p_id_adherent: Number(adherentId),
    });
    if (error) throw new Error(error.message);
  },

  async findComptes(filters?: CompteEsrFilters): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('v_comptes_esr_details').select('*');

    if (filters?.matricule) {
      query = query.eq('matricule', filters.matricule);
    }
    if (filters?.search) {
      const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'nom', 'prenoms']);
      if (orFilter) query = query.or(orFilter);
    }

    const { data, error } = await query.order('nom', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findCapitalInputs(adherentIds: Array<number | string>): Promise<CompteCapitalInputRow[]> {
    if (adherentIds.length === 0) return [];
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select('id_adherent,age_retraite,cotisation_annuelle,taux_gar,frais_rente')
      .in('id_adherent', adherentIds);
    if (error) throw new Error(error.message);
    return (data ?? []) as CompteCapitalInputRow[];
  },

  async findByAdherentId(adherentId: string, matricule?: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    let query: any = supabase
      .from('v_comptes_esr_details')
      .select('*')
      .eq('id_adherent', adherentId);

    if (matricule) {
      query = query.eq('matricule', matricule);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findHistoriqueAnnuel(adherentId: string, periode: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('historique_cotisations_esr')
      .select('id_adherent,periode,capital_cumule,pm,valeur_rachat,date_valeur,version_calc')
      .eq('id_adherent', adherentId)
      .eq('periode', periode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async saveCalculatedAccount(input: {
    adherentId: string;
    capitalAcquis: number;
    primesPeriodiques: number;
    cotisationUnique: number;
    provisionMathematique: number;
    valeurRachat: number;
    dateCalcul: string;
    versionCalcul: string;
  }): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data: existing, error: findError } = await supabase
      .from('comptes_esr')
      .select('id_compte_esr')
      .eq('id_adherent', input.adherentId)
      .maybeSingle();
    if (findError) throw new Error(findError.message);

    const payload = {
      capital_acquis: input.capitalAcquis,
      pp: input.primesPeriodiques,
      pu: input.cotisationUnique,
      pm: input.provisionMathematique,
      valeur_rachat: input.valeurRachat,
      date_calcul: input.dateCalcul,
      version_calc: input.versionCalcul,
      updated_at: new Date().toISOString(),
    };

    const query = existing?.id_compte_esr
      ? supabase.from('comptes_esr').update(payload).eq('id_compte_esr', existing.id_compte_esr)
      : supabase.from('comptes_esr').insert({ ...payload, id_adherent: input.adherentId });
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    return data;
  },
};
