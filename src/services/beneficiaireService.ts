import { apiDelete, apiGet, apiPost, apiPut } from '../lib/apiClient';
import { Beneficiaire, LienBeneficiaire } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

export const beneficiaireService = {
  async getBeneficiairesByAdherent(adherentId: number): Promise<{ data: Beneficiaire[]; error: Error | null }> {
    if (!adherentId || isNaN(adherentId) || adherentId <= 0) {
      return { data: [], error: new Error(`ID adherent invalide : ${adherentId}`) };
    }

    const { data, error } = await apiGet<ApiResponse<Beneficiaire[]>>(
      `/api/beneficiaires?adherentId=${encodeURIComponent(String(adherentId))}`,
    );

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async createBeneficiaire(
    beneficiaire: Pick<Beneficiaire, 'id_adherent' | 'nom_benef' | 'prenoms_benef' | 'contact' | 'lien' | 'pourcentage'>,
  ): Promise<{ data: Beneficiaire | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<Beneficiaire>>('/api/beneficiaires', beneficiaire);

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async updateBeneficiaire(
    id: number,
    beneficiaire: Pick<Beneficiaire, 'nom_benef' | 'prenoms_benef' | 'contact' | 'lien' | 'pourcentage'>,
  ): Promise<{ data: Beneficiaire | null; error: Error | null }> {
    const { data, error } = await apiPut<ApiResponse<Beneficiaire>>(
      `/api/beneficiaires/${encodeURIComponent(String(id))}`,
      beneficiaire,
    );

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async deleteBeneficiaire(id: number): Promise<{ error: Error | null }> {
    const { data, error } = await apiDelete<ApiResponse<null>>(
      `/api/beneficiaires/${encodeURIComponent(String(id))}`,
    );

    if (error) return { error: new Error(error) };
    return { error: toError(data?.error) };
  },

  async getLiensBeneficiaires(): Promise<{ data: LienBeneficiaire[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<LienBeneficiaire[]>>('/api/beneficiaires/liens');

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },
};
