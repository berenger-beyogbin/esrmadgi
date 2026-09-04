import { getSupabaseServer } from '../config/supabaseServer';

export interface BeneficiairePayload {
  id_adherent: number;
  nom_benef: string;
  prenoms_benef: string;
  contact?: string | null;
  lien: string;
  pourcentage: number;
}

export interface BeneficiaireUpdatePayload {
  nom_benef: string;
  prenoms_benef: string;
  contact?: string | null;
  lien: string;
  pourcentage: number;
}

export interface BeneficiaireRow extends BeneficiairePayload {
  id_beneficiaire: number;
}

export const beneficiairesRepository = {
  async findByAdherentId(adherentId: number): Promise<BeneficiaireRow[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('beneficiaires')
      .select('*')
      .eq('id_adherent', adherentId)
      .order('id_beneficiaire', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as BeneficiaireRow[];
  },

  async findById(id: number): Promise<BeneficiaireRow | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('beneficiaires')
      .select('*')
      .eq('id_beneficiaire', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as BeneficiaireRow | null) ?? null;
  },

  async create(payload: BeneficiairePayload): Promise<BeneficiaireRow> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('beneficiaires')
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as BeneficiaireRow;
  },

  async update(id: number, payload: BeneficiaireUpdatePayload): Promise<BeneficiaireRow> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('beneficiaires')
      .update(payload)
      .eq('id_beneficiaire', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as BeneficiaireRow;
  },

  async delete(id: number): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('beneficiaires')
      .delete()
      .eq('id_beneficiaire', id);

    if (error) throw new Error(error.message);
  },

  async findActiveLiens(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('liens_beneficiaires')
      .select('id_lien_beneficiaire, libelle_lien, actif')
      .eq('actif', true)
      .order('libelle_lien');

    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
