import { getSupabaseServer } from '../config/supabaseServer';

export const precomptesRepository = {
  async findPrecomptes(filters?: { search?: string }): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('v_precomptes_details').select('*');

    if (filters?.search) {
      query = query.ilike('periode', `%${filters.search}%`);
    }

    const { data, error } = await query.order('periode', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findPrecompteMapByPeriode(periode: string): Promise<Record<string, number>> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('precomptes')
      .select('matricule, montant_depart')
      .eq('periode', periode);

    if (error) throw new Error(error.message);

    const map: Record<string, number> = {};
    (data ?? []).forEach((row: any) => {
      if (row.matricule) {
        map[String(row.matricule)] = Number(row.montant_depart) || 0;
      }
    });
    return map;
  },

  async findGeneratedMatricules(periode: string): Promise<Set<string>> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('precomptes')
      .select('matricule')
      .eq('periode', periode);

    if (error) throw new Error(error.message);
    return new Set((data ?? []).map((row: any) => String(row.matricule)));
  },

  async createPrecompte(input: {
    matricule: string;
    periode: string;
    montant_depart: number;
    montant_retour: number;
    annee: number;
    trimestre: number;
    statut_precompte: string;
    date_generation: string;
    id_cotisation_detail: number;
  }): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('precomptes').insert(input);
    if (error) throw new Error(error.message);
  },

  async deleteCotisationDetail(id: number): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('cotisation_details').delete().eq('id_cotisation_detail', id);
    if (error) throw new Error(error.message);
  },
};
