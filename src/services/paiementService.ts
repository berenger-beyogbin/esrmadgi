import { apiGet, apiPost } from '../lib/apiClient';
import { Paiement } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

export const paiementService = {
  async getPaiements(): Promise<{ data: Paiement[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<Paiement[]>>('/api/paiements');

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async createPaiement(paiement: Omit<Paiement, 'id'>): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<unknown>>('/api/paiements', {
      adherent_id: paiement.adherent_id,
      date_paiement: paiement.date_paiement,
      montant_paiement: Number(paiement.montant_paiement) || 0,
      moyen: paiement.moyen,
      origine_paiement: paiement.origine_paiement,
      observation_dgi: paiement.observation_dgi || '',
      date_valeur: paiement.date_valeur,
    });

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },
};
