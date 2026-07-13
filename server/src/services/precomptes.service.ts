import { AppError } from '../middleware/errorHandler';
import { precomptesRepository } from '../repositories/precomptes.repository';

function assertPeriode(periode: string): string {
  const normalized = periode.trim().toUpperCase();
  if (!/^\d{4}T[1-4]$/.test(normalized)) {
    throw new AppError(400, 'Format de periode invalide. Attendu : 2026T2');
  }
  return normalized;
}

export const precomptesService = {
  async getPrecomptes(filters?: { search?: string }): Promise<unknown[]> {
    return precomptesRepository.findPrecomptes(filters);
  },

  async getPrecomptesMapByPeriode(periode: string): Promise<Record<string, number>> {
    return precomptesRepository.findPrecompteMapByPeriode(assertPeriode(periode));
  },
};
