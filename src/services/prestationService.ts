import { apiDownloadBlob, apiGet, apiPatch, apiPost } from '../lib/apiClient';
import { EcheanceAps, EcheanceApsStatut, RenreDetails, RenteVersement, VPrestationDetails } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

function appendParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value && value.trim()) {
    params.set(key, value.trim());
  }
}

export const prestationService = {
  async getPrestations(filters?: {
    search?: string;
    type?: string;
    statut?: string;
  }): Promise<{ data: VPrestationDetails[]; error: Error | null }> {
    const params = new URLSearchParams();
    appendParam(params, 'search', filters?.search);
    appendParam(params, 'type', filters?.type);
    appendParam(params, 'statut', filters?.statut);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const { data, error } = await apiGet<ApiResponse<VPrestationDetails[]>>(`/api/prestations${qs}`);

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async createPrestation(prestationData: {
    adherent_id: string;
    type_prestation: string;
    statut_prestation: string;
    date_demande: string;
    montant?: number;
    details_observation?: string;
  }): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<unknown>>('/api/prestations', {
      adherent_id: prestationData.adherent_id,
      type_prestation: prestationData.type_prestation,
      statut_prestation: prestationData.statut_prestation || 'DOSSIER_OUVERT',
      date_demande: prestationData.date_demande,
    });

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async getRentes(): Promise<{ data: RenreDetails[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<RenreDetails[]>>('/api/prestations/rentes');

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async getRenteVersements(renteId: string): Promise<{ data: RenteVersement[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<RenteVersement[]>>(
      `/api/prestations/rentes/${encodeURIComponent(renteId)}/versements`,
    );

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async getEcheances(filters?: { annee?: number; trimestre?: number; statut?: string }) {
    const params = new URLSearchParams();
    if (filters?.annee) params.set('annee', String(filters.annee));
    if (filters?.trimestre) params.set('trimestre', String(filters.trimestre));
    appendParam(params, 'statut', filters?.statut);
    const qs = params.toString() ? `?${params}` : '';
    const { data, error } = await apiGet<ApiResponse<EcheanceAps[]>>(`/api/prestations/echeances${qs}`);
    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async genererEcheances(annee: number, trimestre: number) {
    const { data, error } = await apiPost<ApiResponse<{ periode: string; eligibles: number; creees: number }>>(
      '/api/prestations/echeances/generer', { annee, trimestre },
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async changerStatutEcheance(id: string, statut: Exclude<EcheanceApsStatut, 'GENEREE' | 'PAYEE'>, observation = '') {
    const { data, error } = await apiPatch<ApiResponse<unknown>>(
      `/api/prestations/echeances/${encodeURIComponent(id)}/statut`, { statut, observation },
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async payerEcheance(id: string, paiement: {
    datePaiement: string; referencePaiement: string; modePaiement: 'VIREMENT' | 'CHEQUE'; pieceJustificative?: string;
  }) {
    const { data, error } = await apiPatch<ApiResponse<unknown>>(
      `/api/prestations/echeances/${encodeURIComponent(id)}/paiement`, paiement,
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async telechargerLiquidation(id: string): Promise<{ data: Blob | null; error: Error | null }> {
    const { data, error } = await apiDownloadBlob(`/api/prestations/${encodeURIComponent(id)}/liquidation.pdf`);
    return { data, error: error ? new Error(error) : null };
  },

  async changerStatut(
    id: string,
    statut: 'EN_CONTROLE' | 'VALIDE' | 'PAYE' | 'ANNULE',
    observation = '',
  ): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPatch<ApiResponse<unknown>>(
      `/api/prestations/${encodeURIComponent(id)}/statut`,
      { statut, observation },
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },
};
