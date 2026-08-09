import { apiGet, apiPost } from '../lib/apiClient';
import { ControleCloturePeriode, PeriodeMetier } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

export const periodeService = {
  async list(): Promise<{ data: PeriodeMetier[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<PeriodeMetier[]>>('/api/periodes');
    return {
      data: data?.data ?? [],
      error: error || data?.error ? new Error(error || data?.error || 'Erreur de chargement.') : null,
    };
  },

  async create(input: { annee: number; trimestre: number }): Promise<{ data: PeriodeMetier | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<PeriodeMetier>>('/api/periodes', input);
    return {
      data: data?.data ?? null,
      error: error || data?.error ? new Error(error || data?.error || 'Erreur de creation.') : null,
    };
  },

  async getControleCloture(periode: string): Promise<{ data: ControleCloturePeriode | null; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<ControleCloturePeriode>>(
      `/api/periodes/${encodeURIComponent(periode)}/cloture-controles`,
    );
    return {
      data: data?.data ?? null,
      error: error || data?.error ? new Error(error || data?.error || 'Erreur de contrôle de la clôture.') : null,
    };
  },

  async cloturer(periode: string): Promise<{ data: { periode: string; periode_suivante: string } | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<{ periode: string; periode_suivante: string }>>(
      `/api/periodes/${encodeURIComponent(periode)}/cloturer`,
      {},
    );
    return {
      data: data?.data ?? null,
      error: error || data?.error ? new Error(error || data?.error || 'Erreur de clôture de la période.') : null,
    };
  },
};
