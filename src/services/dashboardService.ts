import { apiGet } from '../lib/apiClient';
import { DashboardStats } from '../types';

type ApiResponse<T> = { data: T; error: string | null };

const emptyStats: DashboardStats = {
  totalAdherentsActifs: 0,
  cotisationTrimestrielleTotale: 0,
  provisionTotale: 0,
  provisionPeriode: null,
  provisionDateArrete: null,
  provisionDisponible: false,
  capitalAcquisTotal: 0,
  nombrePrestations: 0,
  repartition: {
    actif: 0,
    retraite: 0,
    decede: 0,
    autre: 0,
  },
  totalPm: 0,
  dernieresCotisations: [],
  dernieresPrestations: [],
};

export async function getDashboardStats(periode: string): Promise<DashboardStats> {
  const query = new URLSearchParams({ periode });
  const { data, error } = await apiGet<ApiResponse<DashboardStats>>(`/api/dashboard?${query}`);

  if (error) throw new Error(error);
  if (data?.error) throw new Error(data.error);
  return data?.data ?? emptyStats;
}
