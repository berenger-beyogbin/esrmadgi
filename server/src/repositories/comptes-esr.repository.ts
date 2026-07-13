import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface CompteEsrFilters {
  search?: string;
  matricule?: string;
}

export const comptesEsrRepository = {
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
};
