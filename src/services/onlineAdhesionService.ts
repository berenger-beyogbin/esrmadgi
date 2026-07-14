import {
  ExternalAgentInfo,
  OnlineAdhesion,
  OnlineAdhesionPayload,
  OnlineAdhesionReferentiels,
  OnlineAdhesionValidationResult,
  OnlineAdhesionStatus,
} from '../types';
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

async function getSingle<T>(path: string): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await apiGet<ApiResponse<T>>(path);
  if (error) return { data: null, error: new Error(error) };
  return { data: data?.data ?? null, error: toError(data?.error) };
}

async function postSingle<T>(path: string, payload: unknown): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await apiPost<ApiResponse<T>>(path, payload);
  if (error) return { data: null, error: new Error(error) };
  return { data: data?.data ?? null, error: toError(data?.error) };
}

export const onlineAdhesionService = {
  async getReferentiels(): Promise<{ data: OnlineAdhesionReferentiels | null; error: Error | null }> {
    return getSingle<OnlineAdhesionReferentiels>('/api/adhesions-en-ligne/referentiels');
  },

  async searchAgent(matricule: string, dateNaissance: string): Promise<{ data: ExternalAgentInfo | null; error: string | null }> {
    const mat = matricule.trim().toUpperCase();
    if (!mat) return { data: null, error: 'Matricule requis' };
    if (!dateNaissance) return { data: null, error: 'Date de naissance requise' };

    type SearchResponse = { found: boolean; data: ExternalAgentInfo | null; error: string | null };
    const { data, error } = await apiPost<SearchResponse>('/api/adhesions-en-ligne/search-agent', {
      matricule: mat,
      date_naissance: dateNaissance,
    });
    if (error) return { data: null, error };
    if (!data) return { data: null, error: 'Reponse vide du serveur' };
    if (data.found && data.data) return { data: data.data, error: null };
    return { data: null, error: data.error };
  },

  async submit(payload: OnlineAdhesionPayload): Promise<{ data: OnlineAdhesion | null; error: Error | null }> {
    return postSingle<OnlineAdhesion>('/api/adhesions-en-ligne', payload);
  },

  async list(filters?: {
    search?: string;
    statut?: OnlineAdhesionStatus | 'TOUS';
  }): Promise<{ data: OnlineAdhesion[]; error: Error | null }> {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    if (filters?.statut && filters.statut !== 'TOUS') params.set('statut', filters.statut);
    const query = params.toString() ? `?${params.toString()}` : '';

    const { data, error } = await apiGet<ApiResponse<OnlineAdhesion[]>>(`/api/adhesions-en-ligne${query}`);
    if (error) return { data: [], error: new Error(error) };
    return { data: data?.data ?? [], error: toError(data?.error) };
  },

  async detail(id: string): Promise<{ data: OnlineAdhesion | null; error: Error | null }> {
    return getSingle<OnlineAdhesion>(`/api/adhesions-en-ligne/${encodeURIComponent(id)}`);
  },

  async update(id: string, payload: OnlineAdhesionPayload): Promise<{ data: OnlineAdhesion | null; error: Error | null }> {
    const { data, error } = await apiPut<ApiResponse<OnlineAdhesion>>(
      `/api/adhesions-en-ligne/${encodeURIComponent(id)}`,
      payload,
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async validate(id: string, payload: OnlineAdhesionPayload): Promise<{ data: OnlineAdhesionValidationResult | null; error: Error | null }> {
    return postSingle<OnlineAdhesionValidationResult>(`/api/adhesions-en-ligne/${encodeURIComponent(id)}/validate`, payload);
  },

  async reject(id: string, motif?: string): Promise<{ data: OnlineAdhesion | null; error: Error | null }> {
    return postSingle<OnlineAdhesion>(`/api/adhesions-en-ligne/${encodeURIComponent(id)}/reject`, { motif });
  },
};
