import { apiDownloadBlob, apiGet } from '../lib/apiClient';
import { VCompteEsrDetails } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

function normalizeCompte(row: VCompteEsrDetails): VCompteEsrDetails {
  return {
    ...row,
    id: String(row.id ?? row.id_compte_esr ?? ''),
    adherent_id: String(row.adherent_id ?? row.id_adherent ?? ''),
  };
}

export const compteEsrService = {
  async getComptesEsr(filters?: { search?: string }): Promise<{ data: VCompteEsrDetails[]; error: Error | null }> {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) {
      params.set('search', filters.search.trim());
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    const { data, error } = await apiGet<ApiResponse<VCompteEsrDetails[]>>(`/api/comptes-esr${qs}`);

    if (error) return { data: [], error: new Error(error) };
    return { data: (data?.data ?? []).map(normalizeCompte), error: toError(data?.error) };
  },

  async getCompteByAdherentId(adherentId: string): Promise<{ data: VCompteEsrDetails | null; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<VCompteEsrDetails | null>>(
      `/api/comptes-esr/adherent/${encodeURIComponent(adherentId)}`,
    );

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ? normalizeCompte(data.data) : null, error: toError(data?.error) };
  },

  async telechargerAvisAnnuel(
    adherentId: string,
    annee: number,
  ): Promise<{ data: Blob | null; error: Error | null }> {
    const { data, error } = await apiDownloadBlob(
      `/api/comptes-esr/adherent/${encodeURIComponent(adherentId)}/avis-annuel.pdf?annee=${annee}`,
    );
    return { data, error: error ? new Error(error) : null };
  },
};
