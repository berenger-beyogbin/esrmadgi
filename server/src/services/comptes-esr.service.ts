import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { CompteEsrFilters, comptesEsrRepository } from '../repositories/comptes-esr.repository';

export const comptesEsrService = {
  async getComptes(user: AuthenticatedUser, filters?: CompteEsrFilters): Promise<unknown[]> {
    const scopedFilters = { ...filters };
    if (user.role === 'ADHERENT') {
      if (!user.matricule) return [];
      scopedFilters.matricule = user.matricule;
    }
    return comptesEsrRepository.findComptes(scopedFilters);
  },

  async getCompteByAdherentId(user: AuthenticatedUser, adherentId: string): Promise<unknown | null> {
    if (user.role === 'ADHERENT') {
      if (!user.id_adherent || String(user.id_adherent) !== String(adherentId)) {
        throw new AppError(403, 'Acces refuse au compte ESR de cet adherent');
      }
      return comptesEsrRepository.findByAdherentId(adherentId, user.matricule);
    }
    return comptesEsrRepository.findByAdherentId(adherentId);
  },
};
