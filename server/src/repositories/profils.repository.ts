import { getSupabaseServer } from '../config/supabaseServer';
import { UserProfile } from '../types';

export interface ProfilRow {
  id_profil: number;
  code_profil: string;
  lib_profil: string;
  description: string | null;
  role_base: UserProfile;
  liste_fonctions: string | null;
  etat: number;
  systeme: boolean;
}

const SELECT = 'id_profil, code_profil, lib_profil, description, role_base, liste_fonctions, etat, systeme';

export const profilsRepository = {
  async list(): Promise<ProfilRow[]> {
    const { data, error } = await getSupabaseServer().from('profils').select(SELECT).order('systeme', { ascending: false }).order('lib_profil');
    if (error) throw new Error(error.message);
    return (data ?? []) as ProfilRow[];
  },
  async findByCode(code: string): Promise<ProfilRow | null> {
    const { data, error } = await getSupabaseServer().from('profils').select(SELECT).eq('code_profil', code).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as ProfilRow | null) ?? null;
  },
  async create(input: Omit<ProfilRow, 'id_profil' | 'systeme'>): Promise<ProfilRow> {
    const { data, error } = await getSupabaseServer().from('profils').insert({ ...input, systeme: false }).select(SELECT).single();
    if (error) throw new Error(error.message);
    return data as ProfilRow;
  },
  async update(id: number, input: Partial<Omit<ProfilRow, 'id_profil' | 'code_profil' | 'systeme'>>): Promise<ProfilRow> {
    const { data, error } = await getSupabaseServer().from('profils').update(input).eq('id_profil', id).select(SELECT).single();
    if (error) throw new Error(error.message);
    return data as ProfilRow;
  },
};
