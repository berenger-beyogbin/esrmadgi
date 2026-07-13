import { PaiementPayload, paiementsRepository } from '../repositories/paiements.repository';

export const paiementsService = {
  async getPaiements(): Promise<unknown[]> {
    return paiementsRepository.findPaiements();
  },

  async createPaiement(payload: PaiementPayload): Promise<unknown> {
    return paiementsRepository.createPaiement(payload);
  },
};
