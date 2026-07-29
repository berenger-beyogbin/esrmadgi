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

  async saveCalculatedAccount(input: {
    adherentId: string;
    capitalAcquis: number;
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
