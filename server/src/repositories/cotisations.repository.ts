import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface CotisationFilters {
  search?: string;
  periode?: string;
  statut?: string;
  source?: string;
  dateDebut?: string;
  dateFin?: string;
  idAdherent?: string;
}

export interface CotisationSpontaneePayload {
  id_adherent: number;
  mode: string;
  date: string;
  montant: number;
  id_precompte?: number;
}

export interface ActiveAdherentForCotisation {
  id_adherent: number;
  matricule: string;
  nom?: string | null;
  prenoms?: string | null;
  statut?: boolean | string | null;
  decede?: boolean | null;
  retraite?: boolean | null;
}

export interface ParsedTrimestre {
  annee: number;
  trimestre: number;
  periodeDeb: string;
  periodeFin: string;
}

export const cotisationsRepository = {
  async regulariserPrecompte(input: {
    idPrecompte: number;
    idAdherent: number;
    mode: string;
    periode: string;
    periodeDeb: string;
    periodeFin: string;
    dateValeur: string;
    montant: number;
    reference: string;
  }): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('regulariser_precompte_esr', {
      p_id_precompte: input.idPrecompte,
      p_id_adherent: input.idAdherent,
      p_mode: input.mode,
      p_periode: input.periode,
      p_periode_deb: input.periodeDeb,
      p_periode_fin: input.periodeFin,
      p_date_valeur: input.dateValeur,
      p_montant: input.montant,
      p_reference: input.reference,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async findCotisations(filters?: CotisationFilters): Promise<unknown[]> {
    const supabase = getSupabaseServer();

    // Supabase query builder loses fluent type precision after dynamic filters.
    let query: any = supabase.from('v_cotisations_details').select('*').eq('statut_detail', 'ENCAISSEE');

    if (filters?.idAdherent) {
      query = query.eq('id_adherent', filters.idAdherent);
    }
    if (filters?.periode) {
      query = query.eq('periode', filters.periode);
    }
    if (filters?.source && filters.source !== 'TOUS') {
      query = query.eq('source', filters.source);
    }
    if (filters?.search) {
      const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'nom', 'prenoms']);
      if (orFilter) query = query.or(orFilter);
    }
    if (filters?.dateDebut) {
      query = query.gte('date_valeur', filters.dateDebut);
    }
    if (filters?.dateFin) {
      query = query.lte('date_valeur', filters.dateFin);
    }

    const { data, error } = await query.order('periode', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findCotisationsByMatricule(matricule: string): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_cotisations_details')
      .select('*')
      .eq('matricule', matricule)
      .order('date_valeur', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findCotisationsByAdherentId(idAdherent: string): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_cotisations_details')
      .select('*')
      .eq('id_adherent', idAdherent)
      .eq('statut_detail', 'ENCAISSEE')
      .order('date_valeur', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findEncaisseesByAdherentId(idAdherent: string, dateCalcul: string): Promise<Array<{
    montant: number;
    date_valeur: string;
    source: string;
  }>> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_cotisations_details')
      .select('montant,date_valeur,source')
      .eq('id_adherent', idAdherent)
      .eq('statut_detail', 'ENCAISSEE')
      .not('date_valeur', 'is', null)
      .lte('date_valeur', dateCalcul)
      .order('date_valeur', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      montant: Number(row.montant ?? 0),
      date_valeur: String(row.date_valeur),
      source: String(row.source ?? 'PRECOMPTE').toUpperCase(),
    }));
  },

  async findActiveAdherentsForCotisation(): Promise<ActiveAdherentForCotisation[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select('*')
      .eq('statut', true)
      .eq('decede', false)
      .eq('retraite', false)
      .order('nom', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as ActiveAdherentForCotisation[];
  },

  async findActiveAdherentById(idAdherent: number): Promise<ActiveAdherentForCotisation | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select('id_adherent, matricule, nom, prenoms, statut, decede, retraite')
      .eq('id_adherent', idAdherent)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as ActiveAdherentForCotisation | null) ?? null;
  },

  async findActiveInfoCotisation(idAdherent: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('info_cotisations')
      .select('*')
      .eq('id_adherent', idAdherent)
      .eq('info_actif', true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async createCotisationEntete(input: {
    id_adherent: number;
    mode: string;
    periode_deb: string;
    periode_fin: string;
    reference: string;
    statut: string;
  }): Promise<{ id_cotisation_entete: number; reference: string }> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('cotisation_entetes')
      .insert(input)
      .select('id_cotisation_entete, reference')
      .single();

    if (error) throw new Error(error.message);
    return data as { id_cotisation_entete: number; reference: string };
  },

  async createCotisationDetail(input: {
    id_cotisation_entete: number;
    periode: string;
    date_valeur: string | null;
    montant: number;
    source: string;
    statut: string;
  }): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('cotisation_details')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteCotisationEntete(id: number): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('cotisation_entetes').delete().eq('id_cotisation_entete', id);
    if (error) throw new Error(error.message);
  },
};
