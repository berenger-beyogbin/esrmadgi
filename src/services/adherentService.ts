import { VAdherentComplet, Civilite, SituationMatrimoniale, Emploi, Fonction, Grade, ExternalAgentInfo, AuditLog, AdherentFilterOptions, AdherentEligiblePromo } from '../types';
import { apiGet, apiPost, apiPut } from '../lib/apiClient';

type ApiResponse<T> = { data: T; error: string | null };

function toError(error: string | null | undefined): Error | null {
  return error ? new Error(error) : null;
}

async function getList<T>(path: string): Promise<{ data: T[]; error: Error | null }> {
  const { data, error } = await apiGet<ApiResponse<T[]>>(path);
  if (error) return { data: [], error: new Error(error) };
  return { data: data?.data ?? [], error: toError(data?.error) };
}

async function getSingle<T>(path: string): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await apiGet<ApiResponse<T | null>>(path);
  if (error) return { data: null, error: new Error(error) };
  return { data: data?.data ?? null, error: toError(data?.error) };
}

export const adherentService = {
  async getAdherents(filters?: {
    search?: string;
    statut?: string;
    dateInscription?: string;
    direction?: string;
    categorie?: string;
    trimestrePremierPrecompte?: string;
  }): Promise<{ data: VAdherentComplet[]; error: Error | null }> {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    if (filters?.statut && filters.statut !== 'TOUS') params.set('statut', filters.statut);
    if (filters?.dateInscription) params.set('dateInscription', filters.dateInscription);
    if (filters?.direction) params.set('direction', filters.direction);
    if (filters?.categorie) params.set('categorie', filters.categorie);
    if (filters?.trimestrePremierPrecompte) {
      params.set('trimestrePremierPrecompte', filters.trimestrePremierPrecompte);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';

    return getList<VAdherentComplet>(`/api/adherents${qs}`);
  },

  async getFilterOptions(): Promise<{ data: AdherentFilterOptions | null; error: Error | null }> {
    return getSingle<AdherentFilterOptions>('/api/adherents/filters/options');
  },

  async getAdherentById(id: string): Promise<{ data: VAdherentComplet | null; error: Error | null }> {
    return getSingle<VAdherentComplet>(`/api/adherents/${encodeURIComponent(id)}`);
  },

  async saveAdherent(adherentData: any): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<unknown>>('/api/adherents', adherentData);
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async updateAdherent(id: string, adherentData: any): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPut<ApiResponse<unknown>>(
      `/api/adherents/${encodeURIComponent(id)}`,
      adherentData,
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async changeLifecycle(
    id: string,
    payload: { action: 'ACTIVER' | 'DESACTIVER' | 'RETRAITE' | 'DECES'; motif?: string },
  ): Promise<{ data: VAdherentComplet | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<VAdherentComplet>>(
      `/api/adherents/${encodeURIComponent(id)}/lifecycle`,
      payload,
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async createLinkedAccess(
    id: string,
    payload: { email?: string; telephone?: string | null; password: string },
  ): Promise<{ data: unknown | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<unknown>>(
      `/api/adherents/${encodeURIComponent(id)}/access`,
      payload,
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async getHistory(id: string): Promise<{ data: AuditLog[]; error: Error | null }> {
    return getList<AuditLog>(`/api/adherents/${encodeURIComponent(id)}/history`);
  },

  async getCivilites(): Promise<{ data: Civilite[]; error: Error | null }> {
    return getList<Civilite>('/api/adherents/referentiels/civilites');
  },

  async getSituationsMatrimoniales(): Promise<{ data: SituationMatrimoniale[]; error: Error | null }> {
    return getList<SituationMatrimoniale>('/api/adherents/referentiels/situations-matrimoniales');
  },

  async getEmplois(): Promise<{ data: Emploi[]; error: Error | null }> {
    return getList<Emploi>('/api/adherents/referentiels/emplois');
  },

  async getFonctions(): Promise<{ data: Fonction[]; error: Error | null }> {
    return getList<Fonction>('/api/adherents/referentiels/fonctions');
  },

  async getGrades(): Promise<Grade[]> {
    const { data, error } = await getList<Grade>('/api/adherents/referentiels/grades');
    if (error) {
      console.error('Erreur getGrades:', error);
      return [];
    }
    return data;
  },

  async getPromoRetraiteEligibles(): Promise<{ data: AdherentEligiblePromo[]; error: Error | null }> {
    return getList<AdherentEligiblePromo>('/api/adherents/promo-retraite/eligibles');
  },

  async appliquerPromoRetraite(
    idsAdherent?: number[],
  ): Promise<{ data: { appliques: AdherentEligiblePromo[] } | null; error: Error | null }> {
    const { data, error } = await apiPost<ApiResponse<{ appliques: AdherentEligiblePromo[] }>>(
      '/api/adherents/promo-retraite/appliquer',
      { ids_adherent: idsAdherent },
    );
    if (error) return { data: null, error: new Error(error) };
    return { data: data?.data ?? null, error: toError(data?.error) };
  },

  async searchAgentByMatricule(matricule: string): Promise<{
    data: ExternalAgentInfo | null;
    error: string | null;
    alreadyAdherent: boolean;
    adherentId: string | null;
  }> {
    const mat = matricule.trim().toUpperCase();
    if (!mat) return { data: null, error: 'Matricule vide', alreadyAdherent: false, adherentId: null };

    type SearchResponse = {
      found: boolean;
      data: ExternalAgentInfo | null;
      error: string | null;
      alreadyAdherent?: boolean;
      adherentId?: string | null;
    };
    const { data: result, error: networkError } = await apiPost<SearchResponse>(
      '/api/agents/search-by-matricule',
      { matricule: mat },
    );

    if (networkError) return { data: null, error: networkError, alreadyAdherent: false, adherentId: null };
    if (!result) return { data: null, error: 'Reponse vide du serveur', alreadyAdherent: false, adherentId: null };

    const membership = {
      alreadyAdherent: result.alreadyAdherent === true,
      adherentId: result.adherentId ?? null,
    };
    if (result.found && result.data) return { data: result.data, error: null, ...membership };
    if (result.error) return { data: null, error: result.error, ...membership };
    return { data: null, error: null, ...membership };
  },
};
