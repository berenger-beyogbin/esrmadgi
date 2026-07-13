import { apiGet, apiPost, apiPut } from '../lib/apiClient';
import { UserProfile, UtilisateurAcces } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

export interface UtilisateurFilters {
  search?: string;
  profil?: UserProfile | 'TOUS';
  actif?: 'TOUS' | 'true' | 'false';
}

export interface CreateUtilisateurPayload {
  matricule: string;
  email: string;
  password: string;
  profil: UserProfile;
  telephone?: string | null;
  user_actif?: boolean;
  id_adherent?: number | null;
}

export interface UpdateUtilisateurPayload {
  email?: string;
  password?: string;
  profil?: UserProfile;
  telephone?: string | null;
  user_actif?: boolean;
  id_adherent?: number | null;
}

export const utilisateurService = {
  async getUtilisateurs(filters?: UtilisateurFilters): Promise<{ data: UtilisateurAcces[]; error: Error | null }> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.profil && filters.profil !== 'TOUS') params.set('profil', filters.profil);
    if (filters?.actif && filters.actif !== 'TOUS') params.set('actif', filters.actif);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data, error } = await apiGet<ApiResponse<UtilisateurAcces[]>>(`/api/utilisateurs${qs}`);
    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async createUtilisateur(payload: CreateUtilisateurPayload): Promise<{ data: UtilisateurAcces | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<UtilisateurAcces>>('/api/utilisateurs', payload);
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async updateUtilisateur(
    id: number,
    payload: UpdateUtilisateurPayload,
  ): Promise<{ data: UtilisateurAcces | null; error: Error | null }> {
    const { data, error } = await apiPut<ApiResponse<UtilisateurAcces>>(
      `/api/utilisateurs/${encodeURIComponent(String(id))}`,
      payload,
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },
};
