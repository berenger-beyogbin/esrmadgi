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
  montant?: number;
}

export const prestationsRepository = {
  async findAdherentDateSouscription(adherentId: string): Promise<string | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select('date_souscription')
      .eq('id_adherent', adherentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.date_souscription ? String(data.date_souscription) : null;
  },

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
    return (data ?? []).map((row: any) => ({
      ...row,
      id: row.id_prestation,
      adherent_id: row.id_adherent,
      montant: row.montant_du,
    }));
  },

  async createPrestation(payload: PrestationPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { adherent_id, montant, ...reste } = payload;
    const { data, error } = await supabase
      .from('prestations')
      .insert([{
        ...reste,
        id_adherent: Number(adherent_id),
        montant_du: Number(montant ?? 0),
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      ...data,
      id: data.id_prestation,
      adherent_id: data.id_adherent,
      montant: data.montant_du,
    };
  },

  async findById(id: string): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_prestations_details')
      .select('*')
      .eq('id_prestation', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? {
      ...data,
      id: data.id_prestation,
      adherent_id: data.id_adherent,
      montant: data.montant_du,
    } : null;
  },

  async updateStatut(
    id: string,
    statut: string,
    dates: { date_validation?: string; date_paiement?: string },
  ): Promise<any> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('prestations')
      .update({ statut_prestation: statut, ...dates })
      .eq('id_prestation', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      id: data.id_prestation,
      adherent_id: data.id_adherent,
      montant: data.montant_du,
    };
  },

  async findRentes(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rentes')
      .select(`
        id_rente,
        id_adherent,
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
      id: r.id_rente,
      adherent_id: r.id_adherent,
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
      .eq('id_rente', renteId)
      .order('date_versement', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      id: row.id_rente_versement,
      rente_id: row.id_rente,
      montant_versement: row.montant,
    }));
  },
};
