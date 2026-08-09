import { AppError } from '../middleware/errorHandler';

export interface Trimestre {
  annee: number;
  trimestre: number;
  periode: string;
}

export function assertPeriode(periode: string): string {
  const normalized = periode.trim().toUpperCase();
  if (!/^\d{4}T[1-4]$/.test(normalized)) {
    throw new AppError(400, 'Format de periode invalide. Attendu : 2026T2');
  }
  return normalized;
}

export function getTrimestreCourant(): Trimestre {
  const now = new Date();
  const annee = now.getUTCFullYear();
  const trimestre = Math.ceil((now.getUTCMonth() + 1) / 3);
  return { annee, trimestre, periode: `${annee}T${trimestre}` };
}
