import { PrestationFilters, PrestationPayload, prestationsRepository } from '../repositories/prestations.repository';

export const prestationsService = {
  async getPrestations(filters?: PrestationFilters): Promise<unknown[]> {
    return prestationsRepository.findPrestations(filters);
  },

  async createPrestation(payload: PrestationPayload): Promise<unknown> {
    return prestationsRepository.createPrestation(payload);
  },

  async getRentes(): Promise<unknown[]> {
    return prestationsRepository.findRentes();
  },

  async getRenteVersements(renteId: string): Promise<unknown[]> {
    return prestationsRepository.findRenteVersements(renteId);
  },
};
