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

  async findNonPrecomptes(periode?: string): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase
      .from('v_precomptes_details')
      .select('*')
      .in('statut_precompte', ['NON_PRECOMPTE', 'ECART']);
    if (periode) query = query.eq('periode', periode);
    const { data, error } = await query.order('periode', { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const matricules = Array.from(new Set(rows.map((row: any) => String(row.matricule)).filter(Boolean)));
    if (matricules.length === 0) return [];
    const { data: adherents, error: adherentsError } = await supabase
      .from('adherents')
      .select('matricule,telephone')
      .in('matricule', matricules);
    if (adherentsError) throw new Error(adherentsError.message);
    const telephones = new Map((adherents ?? []).map((row: any) => [String(row.matricule), row.telephone]));
    return rows.map((row: any) => ({ ...row, telephone: telephones.get(String(row.matricule)) ?? '' }));
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

  async findByMatriculeAndPeriode(matricule: string, periode: string): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('precomptes')
      .select('*')
      .eq('matricule', matricule)
      .eq('periode', periode)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findById(idPrecompte: number): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('precomptes')
      .select('*')
      .eq('id_precompte', idPrecompte)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async markRegularise(input: {
    idPrecompte: number;
    montantRetour: number;
    dateRetour: string;
    statutPrecompte: string;
  }): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('precomptes')
      .update({
        montant_retour: input.montantRetour,
        date_retour: input.dateRetour,
        statut_precompte: input.statutPrecompte,
        updated_at: new Date().toISOString(),
      })
      .eq('id_precompte', input.idPrecompte);
    if (error) throw new Error(error.message);
  },

  async reporterPrecompte(idPrecompte: number): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('precomptes')
      .update({
        statut_precompte: 'REPORTE',
        updated_at: new Date().toISOString(),
      })
      .eq('id_precompte', idPrecompte);
    if (error) throw new Error(error.message);
  },

  async applyRetour(input: {
    idPrecompte: number;
    idCotisationDetail: number;
    montantRetour: number;
    dateRetour: string;
    statutPrecompte: string;
    motif: string;
  }): Promise<void> {
    const supabase = getSupabaseServer();
    const { error: precompteError } = await supabase
      .from('precomptes')
      .update({
        montant_retour: input.montantRetour,
        date_retour: input.dateRetour,
        statut_precompte: input.statutPrecompte,
        updated_at: new Date().toISOString(),
      })
      .eq('id_precompte', input.idPrecompte);
    if (precompteError) throw new Error(precompteError.message);

    const { error: detailError } = await supabase
      .from('cotisation_details')
      .update({
        montant: input.montantRetour,
        date_valeur: input.montantRetour > 0 ? input.dateRetour : null,
        statut: input.montantRetour > 0 ? 'ENCAISSEE' : 'REJETEE',
        updated_at: new Date().toISOString(),
      })
      .eq('id_cotisation_detail', input.idCotisationDetail);
    if (detailError) throw new Error(detailError.message);
  },

  async deleteCotisationDetail(id: number): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('cotisation_details').delete().eq('id_cotisation_detail', id);
    if (error) throw new Error(error.message);
  },
};
