import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import {
  BeneficiairePayload,
  BeneficiaireUpdatePayload,
  BeneficiaireRow,
  beneficiairesRepository,
} from '../repositories/beneficiaires.repository';

function canAccessAdherent(user: AuthenticatedUser, adherentId: number): boolean {
  if (user.role !== 'ADHERENT') return true;
  return user.id_adherent != null && String(adherentId) === String(user.id_adherent);
}

async function ensureCanAccessAdherent(user: AuthenticatedUser, adherentId: number): Promise<void> {
  if (!canAccessAdherent(user, adherentId)) {
    throw new AppError(403, 'Acces refuse aux beneficiaires de cet adherent');
  }
}

async function ensurePercentageLimit(
  adherentId: number,
  nextPourcentage: number,
  excludedBeneficiaireId?: number,
): Promise<void> {
  const rows = await beneficiairesRepository.findByAdherentId(adherentId);
  const currentTotal = rows.reduce((sum, row) => {
    if (excludedBeneficiaireId && row.id_beneficiaire === excludedBeneficiaireId) return sum;
    return sum + (Number(row.pourcentage) || 0);
  }, 0);

  if (currentTotal + nextPourcentage > 100) {
    throw new AppError(400, 'La somme des pourcentages beneficiaires ne peut pas depasser 100%.');
  }
}

async function getExistingBeneficiaire(id: number): Promise<BeneficiaireRow> {
  const existing = await beneficiairesRepository.findById(id);
  if (!existing) {
    throw new AppError(404, 'Beneficiaire introuvable');
  }
  return existing;
}

export const beneficiairesService = {
  async getByAdherent(user: AuthenticatedUser, adherentId: number): Promise<BeneficiaireRow[]> {
    await ensureCanAccessAdherent(user, adherentId);
    return beneficiairesRepository.findByAdherentId(adherentId);
  },

  async create(user: AuthenticatedUser, payload: BeneficiairePayload): Promise<BeneficiaireRow> {
    await ensureCanAccessAdherent(user, payload.id_adherent);
    await ensurePercentageLimit(payload.id_adherent, payload.pourcentage);
    return beneficiairesRepository.create(payload);
  },

  async update(
    user: AuthenticatedUser,
    id: number,
    payload: BeneficiaireUpdatePayload,
  ): Promise<BeneficiaireRow> {
    const existing = await getExistingBeneficiaire(id);
    await ensureCanAccessAdherent(user, existing.id_adherent);
    await ensurePercentageLimit(existing.id_adherent, payload.pourcentage, id);
    return beneficiairesRepository.update(id, payload);
  },

  async delete(user: AuthenticatedUser, id: number): Promise<void> {
    const existing = await getExistingBeneficiaire(id);
    await ensureCanAccessAdherent(user, existing.id_adherent);
    await beneficiairesRepository.delete(id);
  },

  async getLiens(): Promise<unknown[]> {
    return beneficiairesRepository.findActiveLiens();
  },
};
