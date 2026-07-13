import { ReferenceKind, parametresRepository } from '../repositories/parametres.repository';

const fallbackVersions = [
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

function withUpdatedAt(payload: Record<string, unknown>): Record<string, unknown> {
  return { ...payload, updated_at: new Date().toISOString() };
}

export const parametresService = {
  async getGrades(): Promise<unknown[]> {
    return parametresRepository.findGrades();
  },

  async createGrade(payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.createGrade(payload);
  },

  async updateGrade(id: number, payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.updateGrade(id, withUpdatedAt(payload));
  },

  async getVersions(): Promise<unknown[]> {
    try {
      return await parametresRepository.findVersions();
    } catch (err) {
      console.error('[parametres] versions:', err instanceof Error ? err.message : err);
      return fallbackVersions;
    }
  },

  async getRepartitions(): Promise<unknown[]> {
    return parametresRepository.findRepartitions();
  },

  async createRepartition(payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.createRepartition(payload);
  },

  async updateRepartition(id: number, payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.updateRepartition(id, withUpdatedAt(payload));
  },

  async getActiveRepartition(): Promise<unknown | null> {
    return parametresRepository.findActiveRepartition();
  },

  async getMortalite(): Promise<unknown[]> {
    return parametresRepository.findMortalite();
  },

  async getParametresGeneraux(): Promise<unknown[]> {
    return parametresRepository.findParametresGeneraux();
  },

  async updateParametreGeneral(id: number, payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.updateParametreGeneral(id, withUpdatedAt(payload));
  },

  async getParametreGeneralByCode(code: string): Promise<unknown | null> {
    return parametresRepository.findParametreGeneralByCode(code);
  },

  async getReference(kind: ReferenceKind): Promise<unknown[]> {
    return parametresRepository.findReference(kind);
  },

  async createReference(kind: ReferenceKind, payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.createReference(kind, payload);
  },

  async updateReference(kind: ReferenceKind, id: number, payload: Record<string, unknown>): Promise<unknown> {
    return parametresRepository.updateReference(kind, id, withUpdatedAt(payload));
  },
};
