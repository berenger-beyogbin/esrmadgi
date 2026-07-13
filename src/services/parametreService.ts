import { apiGet, apiPost, apiPut } from '../lib/apiClient';
import {
  Grade,
  ParametreVersion,
  ParamRepartition,
  Mortalite,
  Civilite,
  SituationMatrimoniale,
  Emploi,
  LienBeneficiaire,
  Fonction,
} from '../types';

type ApiResponse<T> = { data: T; error: string | null };

const fallbackVersions: ParametreVersion[] = [
  {
    id: 'v-1',
    code: 'TAUX_INTERET_GARANTI',
    nom: "Taux d'interet garanti annuel",
    valeur: '3.5%',
    date_debut: '2020-01-01',
    actif: true,
  },
  {
    id: 'v-2',
    code: 'AGE_RECONDUCTION',
    nom: 'Age limite de reconduction tacite',
    valeur: '65 ans',
    date_debut: '2022-01-01',
    actif: true,
  },
  {
    id: 'v-3',
    code: 'PART_EPARGNE_SANTE',
    nom: 'Repartition Epargne Sante par defaut',
    valeur: '20%',
    date_debut: '2020-01-01',
    actif: true,
  },
];

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

async function createOne<T>(path: string, payload: unknown): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await apiPost<ApiResponse<T>>(path, payload);
  if (error) return { data: null, error: new Error(error) };
  return { data: data?.data ?? null, error: toError(data?.error) };
}

async function updateOne<T>(path: string, payload: unknown): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await apiPut<ApiResponse<T>>(path, payload);
  if (error) return { data: null, error: new Error(error) };
  return { data: data?.data ?? null, error: toError(data?.error) };
}

export const parametreService = {
  async getGrades(): Promise<{ data: Grade[]; error: Error | null }> {
    return getList<Grade>('/api/parametres/grades');
  },

  async createGrade(grade: {
    libelle_grade: string;
    age_retraite: number;
    cotisation_annuelle: number;
    actif?: boolean;
  }): Promise<{ data: Grade | null; error: Error | null }> {
    return createOne<Grade>('/api/parametres/grades', grade);
  },

  async updateGrade(
    id_grade: number,
    updates: {
      libelle_grade?: string;
      age_retraite?: number;
      cotisation_annuelle?: number;
      actif?: boolean;
    }
  ): Promise<{ data: Grade | null; error: Error | null }> {
    return updateOne<Grade>(`/api/parametres/grades/${encodeURIComponent(String(id_grade))}`, updates);
  },

  async getParametreVersions(): Promise<{ data: ParametreVersion[]; error: Error | null }> {
    const { data, error } = await getList<ParametreVersion>('/api/parametres/versions');
    if (error) {
      console.error('Erreur getParametreVersions:', error);
      return { data: fallbackVersions, error: null };
    }
    return { data, error: null };
  },

  async getParamRepartitions(): Promise<{ data: ParamRepartition[]; error: Error | null }> {
    return getList<ParamRepartition>('/api/parametres/repartitions');
  },

  async createParamRepartition(payload: {
    date_effet: string;
    taux_sante: number;
    taux_retraite: number;
    taux_actif?: boolean;
  }): Promise<{ data: ParamRepartition | null; error: Error | null }> {
    return createOne<ParamRepartition>('/api/parametres/repartitions', payload);
  },

  async updateParamRepartition(
    id_param_repartition: number,
    updates: {
      date_effet?: string;
      taux_sante?: number;
      taux_retraite?: number;
      taux_actif?: boolean;
    }
  ): Promise<{ data: ParamRepartition | null; error: Error | null }> {
    return updateOne<ParamRepartition>(
      `/api/parametres/repartitions/${encodeURIComponent(String(id_param_repartition))}`,
      updates,
    );
  },

  async getActiveParamRepartition(): Promise<{ data: ParamRepartition | null; error: Error | null }> {
    return getSingle<ParamRepartition>('/api/parametres/repartitions/active');
  },

  async getMortalite(): Promise<{ data: Mortalite[]; error: Error | null }> {
    return getList<Mortalite>('/api/parametres/mortalite');
  },

  async getCivilites(): Promise<{ data: Civilite[]; error: Error | null }> {
    return getList<Civilite>('/api/parametres/civilites');
  },

  async createCivilite(payload: { libelle_civilite: string; sexe?: string | null; actif?: boolean }): Promise<{ data: Civilite | null; error: Error | null }> {
    return createOne<Civilite>('/api/parametres/civilites', payload);
  },

  async updateCivilite(
    id_civilite: number,
    updates: { libelle_civilite?: string; sexe?: string | null; actif?: boolean }
  ): Promise<{ data: Civilite | null; error: Error | null }> {
    return updateOne<Civilite>(`/api/parametres/civilites/${encodeURIComponent(String(id_civilite))}`, updates);
  },

  async getSituationsMatrimoniales(): Promise<{ data: SituationMatrimoniale[]; error: Error | null }> {
    return getList<SituationMatrimoniale>('/api/parametres/situations-matrimoniales');
  },

  async createSituationMatrimoniale(payload: { libelle_situation: string; actif?: boolean }): Promise<{ data: SituationMatrimoniale | null; error: Error | null }> {
    return createOne<SituationMatrimoniale>('/api/parametres/situations-matrimoniales', payload);
  },

  async updateSituationMatrimoniale(
    id_situation_matrimoniale: number,
    updates: { libelle_situation?: string; actif?: boolean }
  ): Promise<{ data: SituationMatrimoniale | null; error: Error | null }> {
    return updateOne<SituationMatrimoniale>(
      `/api/parametres/situations-matrimoniales/${encodeURIComponent(String(id_situation_matrimoniale))}`,
      updates,
    );
  },

  async getEmplois(): Promise<{ data: Emploi[]; error: Error | null }> {
    return getList<Emploi>('/api/parametres/emplois');
  },

  async createEmploi(payload: { libelle_emploi: string; actif?: boolean }): Promise<{ data: Emploi | null; error: Error | null }> {
    return createOne<Emploi>('/api/parametres/emplois', payload);
  },

  async updateEmploi(
    id_emploi: number,
    updates: { libelle_emploi?: string; actif?: boolean }
  ): Promise<{ data: Emploi | null; error: Error | null }> {
    return updateOne<Emploi>(`/api/parametres/emplois/${encodeURIComponent(String(id_emploi))}`, updates);
  },

  async getLiensBeneficiaires(): Promise<{ data: LienBeneficiaire[]; error: Error | null }> {
    return getList<LienBeneficiaire>('/api/parametres/liens-beneficiaires');
  },

  async createLienBeneficiaire(payload: { libelle_lien: string; actif?: boolean }): Promise<{ data: LienBeneficiaire | null; error: Error | null }> {
    return createOne<LienBeneficiaire>('/api/parametres/liens-beneficiaires', payload);
  },

  async updateLienBeneficiaire(
    id_lien_beneficiaire: number,
    updates: { libelle_lien?: string; actif?: boolean }
  ): Promise<{ data: LienBeneficiaire | null; error: Error | null }> {
    return updateOne<LienBeneficiaire>(
      `/api/parametres/liens-beneficiaires/${encodeURIComponent(String(id_lien_beneficiaire))}`,
      updates,
    );
  },

  async getFonctions(): Promise<{ data: Fonction[]; error: Error | null }> {
    return getList<Fonction>('/api/parametres/fonctions');
  },

  async createFonction(payload: { libelle_fonction: string; actif?: boolean }): Promise<{ data: Fonction | null; error: Error | null }> {
    return createOne<Fonction>('/api/parametres/fonctions', payload);
  },

  async updateFonction(
    id_fonction: number,
    updates: { libelle_fonction?: string; actif?: boolean }
  ): Promise<{ data: Fonction | null; error: Error | null }> {
    return updateOne<Fonction>(`/api/parametres/fonctions/${encodeURIComponent(String(id_fonction))}`, updates);
  },
};
