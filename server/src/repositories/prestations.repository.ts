import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface PrestationFilters {
  search?: string;
  type?: string;
  statut?: string;
}

export interface PrestationPayload {
  adherent_id: string;
  type_prestation: string;
  statut_prestation: string;
  date_demande: string;
  montant: number;
}

export const prestationsRepository = {
  async findPrestations(filters?: PrestationFilters): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('v_prestations_details').select('*');

    if (filters?.type && filters.type !== 'TOUS') {
      query = query.eq('type_prestation', filters.type);
    }
    if (filters?.statut && filters.statut !== 'TOUS') {
      query = query.eq('statut_prestation', filters.statut);
    }
    if (filters?.search) {
      const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'nom', 'prenoms']);
      if (orFilter) query = query.or(orFilter);
    }

    const { data, error } = await query.order('date_demande', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async createPrestation(payload: PrestationPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('prestations')
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async findRentes(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rentes')
      .select(`
        id,
        adherent_id,
        capital_initial,
        capital_restant,
        statut_rente,
        adherents (
          matricule,
          nom,
          prenoms
        )
      `);

    if (error) throw new Error(error.message);

    return (data ?? []).map((r: any) => ({
      id: r.id,
      adherent_id: r.adherent_id,
      matricule: r.adherents?.matricule || 'Inconnu',
      nom: r.adherents?.nom || 'Inconnu',
      prenoms: r.adherents?.prenoms || 'Inconnu',
      capital_initial: r.capital_initial,
      capital_restant: r.capital_restant,
      statut_rente: r.statut_rente || 'ACTIVE',
    }));
  },

  async findRenteVersements(renteId: string): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rente_versements')
      .select('*')
      .eq('rente_id', renteId)
      .order('date_versement', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
