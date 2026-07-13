import { apiGet, apiPost } from '../lib/apiClient';
import {
  CotisationSpontaneePayload,
  GeneratePrecomptesResult,
  InfoCotisation,
  VAdherentComplet,
  VCotisationDetails,
  VPrecompteDetails,
} from '../types';

type ApiResponse<T> = { data: T; error: string | null };
type GenerateResponse = { result: GeneratePrecomptesResult; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

function appendParam(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value && value.trim()) {
    params.set(key, value.trim());
  }
}

function normalizeCotisation(row: VCotisationDetails): VCotisationDetails {
  return {
    ...row,
    id: String(row.id ?? row.id_cotisation_detail ?? ''),
    adherent_id: String(row.adherent_id ?? row.id_adherent ?? ''),
    statut: row.statut ?? row.statut_detail ?? row.statut_entete ?? '',
    date_cotisation: row.date_cotisation ?? row.date_valeur,
  };
}

export const cotisationService = {
  async getCotisations(filters?: {
    search?: string;
    periode?: string;
    statut?: string;
    source?: string;
    dateDebut?: string;
    dateFin?: string;
  }): Promise<{ data: VCotisationDetails[]; error: Error | null }> {
    const params = new URLSearchParams();
    appendParam(params, 'search', filters?.search);
    appendParam(params, 'periode', filters?.periode);
    appendParam(params, 'statut', filters?.statut);
    appendParam(params, 'source', filters?.source);
    appendParam(params, 'dateDebut', filters?.dateDebut);
    appendParam(params, 'dateFin', filters?.dateFin);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data, error } = await apiGet<ApiResponse<VCotisationDetails[]>>(`/api/cotisations${qs}`);

    if (error) return { data: [], error: new Error(error) };
    return { data: (data?.data ?? []).map(normalizeCotisation), error: toError(data?.error) };
  },

  async getCotisationsByAdherentId(adherentId: string): Promise<{ data: VCotisationDetails[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<VCotisationDetails[]>>(
      `/api/cotisations/adherent/${encodeURIComponent(adherentId)}`,
    );

    if (error) return { data: [], error: new Error(error) };
    return { data: (data?.data ?? []).map(normalizeCotisation), error: toError(data?.error) };
  },

  async getCotisationsByMatricule(matricule: string): Promise<{ data: VCotisationDetails[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<VCotisationDetails[]>>(
      `/api/cotisations/matricule/${encodeURIComponent(matricule)}`,
    );

    if (error) return { data: [], error: new Error(error) };
    return { data: (data?.data ?? []).map(normalizeCotisation), error: toError(data?.error) };
  },

  async getAdherentsPourCotisation(): Promise<{ data: VAdherentComplet[]; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<VAdherentComplet[]>>('/api/cotisations/adherents-actifs');

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async getInfoCotisationActive(idAdherent: string): Promise<{ data: InfoCotisation | null; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<InfoCotisation | null>>(
      `/api/cotisations/info/${encodeURIComponent(idAdherent)}`,
    );

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async createCotisationSpontanee(payload: CotisationSpontaneePayload): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<unknown>>('/api/cotisations/spontanee', payload);

    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async generatePrecomptes(periode: string): Promise<{ result: GeneratePrecomptesResult; error: Error | null }> {
    const fallback: GeneratePrecomptesResult = { created: 0, skipped: 0, failed: 0, errors: [] };
    const { data, error } = await apiPost<GenerateResponse>('/api/precomptes/generate', { periode });

    if (error) {
      return { result: { ...fallback, errors: [error] }, error: new Error(error) };
    }

    return {
      result: data?.result ?? fallback,
      error: toError(data?.error),
    };
  },

  async getPrecomptes(filters?: { search?: string }): Promise<{ data: VPrecompteDetails[]; error: Error | null }> {
    const params = new URLSearchParams();
    appendParam(params, 'search', filters?.search);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const { data, error } = await apiGet<ApiResponse<VPrecompteDetails[]>>(`/api/precomptes${qs}`);

    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async getPrecomptesMapByPeriode(periode: string): Promise<{ data: Map<string, number>; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<Record<string, number>>>(
      `/api/precomptes/map?periode=${encodeURIComponent(periode)}`,
    );

    if (error) return { data: new Map(), error: new Error(error) };
    return {
      data: new Map(Object.entries(data?.data ?? {})),
      error: toError(data?.error),
    };
  },
};
