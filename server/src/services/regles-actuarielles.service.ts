import { AppError } from '../middleware/errorHandler';
import { parametresRepository } from '../repositories/parametres.repository';

export interface ReglesActuarielles {
  tauxGaranti: number;
  fraisRente: number;
  ageMaximum: number;
  fraisGestionRachat: number;
  penaliteRachat: number;
  tauxDecesAvantRetraite: number;
  tauxInvaliditeAvantRetraite: number;
  tauxCouvertureRetraite: number;
  tauxRemboursementSoins: number;
  tauxDecesPendantRente: number;
  delaiMinimumRachatAnnees: number;
  dateCalcul: string;
  versions: Record<string, { valeur: string; dateDebut: string | null; dateFin: string | null }>;
}

const requiredCodes = [
  'TAUX_GAR',
  'FRAIS_RENTE',
  'AGE_MAX',
  'FRAIS_GESTION_RACHAT',
  'TAUX_RACHAT',
  'TAUX_DECES_AVANT_RETRAITE',
  'TAUX_INVALIDITE_AVANT_RETRAITE',
  'TAUX_COUVERTURE_RETRAITE',
  'TAUX_REMBOURSEMENT_SOINS',
  'TAUX_DECES_PENDANT_RENTE',
  'DELAI_MIN_RACHAT_ANNEES',
] as const;

function normalizeDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError(400, 'Date de calcul invalide');
  }
  return date;
}

function parseNumber(code: string, value: unknown): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(parsed)) {
    throw new AppError(500, `Valeur invalide pour le parametre ${code}`);
  }
  return parsed;
}

export const reglesActuariellesService = {
  async getRegles(dateCalcul: string): Promise<ReglesActuarielles> {
    const normalizedDate = normalizeDate(dateCalcul);
    const rows = await parametresRepository.findParametresGeneraux();
    const candidates = (rows as Array<Record<string, unknown>>)
      .filter((row) => row.actif === true)
      .filter((row) => !row.date_debut || String(row.date_debut) <= normalizedDate)
      .filter((row) => !row.date_fin || String(row.date_fin) >= normalizedDate);

    const byCode = new Map<string, Record<string, unknown>>();
    for (const row of candidates) {
      const code = String(row.code ?? '');
      const previous = byCode.get(code);
      if (!previous || String(row.date_debut ?? '') > String(previous.date_debut ?? '')) {
        byCode.set(code, row);
      }
    }

    const missing = requiredCodes.filter((code) => !byCode.has(code));
    if (missing.length > 0) {
      throw new AppError(500, `Parametres actuariels manquants : ${missing.join(', ')}`);
    }

    const value = (code: typeof requiredCodes[number]): number =>
      parseNumber(code, byCode.get(code)?.valeur);
    const versions = Object.fromEntries(requiredCodes.map((code) => {
      const row = byCode.get(code)!;
      return [code, {
        valeur: String(row.valeur ?? ''),
        dateDebut: row.date_debut == null ? null : String(row.date_debut),
        dateFin: row.date_fin == null ? null : String(row.date_fin),
      }];
    }));

    return {
      tauxGaranti: value('TAUX_GAR'),
      fraisRente: value('FRAIS_RENTE'),
      ageMaximum: value('AGE_MAX'),
      fraisGestionRachat: value('FRAIS_GESTION_RACHAT'),
      penaliteRachat: value('TAUX_RACHAT'),
      tauxDecesAvantRetraite: value('TAUX_DECES_AVANT_RETRAITE'),
      tauxInvaliditeAvantRetraite: value('TAUX_INVALIDITE_AVANT_RETRAITE'),
      tauxCouvertureRetraite: value('TAUX_COUVERTURE_RETRAITE'),
      tauxRemboursementSoins: value('TAUX_REMBOURSEMENT_SOINS'),
      tauxDecesPendantRente: value('TAUX_DECES_PENDANT_RENTE'),
      delaiMinimumRachatAnnees: value('DELAI_MIN_RACHAT_ANNEES'),
      dateCalcul: normalizedDate,
      versions,
    };
  },
};
