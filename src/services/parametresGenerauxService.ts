import { apiGet, apiPut } from '../lib/apiClient';
import { ParametreGeneral } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

export const parametresGenerauxService = {
  async getParametresGeneraux(): Promise<{ data: ParametreGeneral[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<ParametreGeneral[]>>('/api/parametres/generaux');

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async updateParametreGeneral(
    id: number,
    payload: Partial<Pick<ParametreGeneral, 'valeur' | 'libelle' | 'description' | 'actif' | 'date_debut' | 'date_fin'>>
  ): Promise<{ data: ParametreGeneral | null; error: Error | null }> {
    const { data, error } = await apiPut<ApiResponse<ParametreGeneral>>(
      `/api/parametres/generaux/${encodeURIComponent(String(id))}`,
      payload,
    );

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async getParametreGeneralByCode(code: string): Promise<{ data: ParametreGeneral | null; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<ParametreGeneral | null>>(
      `/api/parametres/generaux/code/${encodeURIComponent(code)}`,
    );

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },
};
