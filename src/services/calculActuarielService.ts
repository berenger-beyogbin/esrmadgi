import { apiGet } from '../lib/apiClient';
import { MortalitePoint } from './adherentCalculationService';

interface ParametreCalcul {
  code: string;
  valeur: string | null;
}

interface ReferencesActuarielles {
  mortalite: MortalitePoint[];
  parametres: ParametreCalcul[];
  promoAbattementRetraite: { actif: boolean; dateDebut: string | null; dateFin: string | null } | null;
}

type ApiResponse<T> = { data: T; error: string | null };

export const calculActuarielService = {
  async getReferences(): Promise<{ data: ReferencesActuarielles | null; error: Error | null }> {
    const { data, error } = await apiGet<ApiResponse<ReferencesActuarielles>>('/api/calcul-actuariel/references');

    if (error) return { data: null, error: new Error(error) };
    if (data?.error) return { data: null, error: new Error(data.error) };
    return { data: data?.data ?? null, error: null };
  },
};
