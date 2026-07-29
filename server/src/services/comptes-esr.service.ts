import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { CompteEsrFilters, comptesEsrRepository } from '../repositories/comptes-esr.repository';
import { cotisationsRepository } from '../repositories/cotisations.repository';
import { auditService } from './audit.service';
import { calculerProvisionDepuisMouvements } from './moteur-actuariel.service';
import { reglesActuariellesService } from './regles-actuarielles.service';
import { genererAvisAnnuelPdf } from './pdf-document.service';

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

  async recalculerCompte(
    user: AuthenticatedUser,
    adherentId: string,
    dateCalcul: string,
  ): Promise<unknown> {
    if (user.role === 'ADHERENT') {
      throw new AppError(403, 'Recalcul reserve aux gestionnaires');
    }

    const regles = await reglesActuariellesService.getRegles(dateCalcul);
    const cotisations = await cotisationsRepository.findEncaisseesByAdherentId(adherentId, dateCalcul);
    const provision = calculerProvisionDepuisMouvements({
      mouvements: cotisations.map((row) => ({
        montant: row.montant,
        dateValeur: row.date_valeur,
      })),
      dateCalcul,
      tauxAnnuelPourcent: regles.tauxGaranti,
    });
    if (provision.statut !== 'OK') {
      throw new AppError(400, 'Impossible de recalculer le compte ESR avec les mouvements disponibles');
    }

    const frais = provision.provisionBrute * regles.fraisGestionRachat / 100;
    const baseApresFrais = provision.provisionBrute - frais;
    const valeurRachat = baseApresFrais * (1 - regles.penaliteRachat / 100);
    const effectiveDates = Array.from(new Set(
      Object.values(regles.versions).map((version) => version.dateDebut ?? 'origine'),
    )).sort();
    const versionCalcul = `ESR-PM-1|${effectiveDates.join(',')}`.slice(0, 50);

    const compte = await comptesEsrRepository.saveCalculatedAccount({
      adherentId,
      capitalAcquis: provision.capitalVerse,
      provisionMathematique: provision.provisionBrute,
      valeurRachat: Math.round((valeurRachat + Number.EPSILON) * 100) / 100,
      dateCalcul,
      versionCalcul,
    });

    await auditService.logEvent(user, {
      action: 'RECALCUL_COMPTE_ESR',
      objetAudit: 'COMPTE_ESR',
      idObjet: adherentId,
      details: JSON.stringify({
        dateCalcul,
        nombreMouvements: provision.nombreMouvements,
        capitalVerse: provision.capitalVerse,
        provision: provision.provisionBrute,
        valeurRachat,
        parametres: regles.versions,
      }),
    });

    return {
      compte,
      calcul: {
        nombreMouvements: provision.nombreMouvements,
        capitalVerse: provision.capitalVerse,
        provisionMathematique: provision.provisionBrute,
        valeurRachat: Math.round((valeurRachat + Number.EPSILON) * 100) / 100,
        tauxTrimestriel: provision.tauxTrimestriel,
        dateCalcul,
      },
    };
  },

  async genererAvisAnnuel(
    user: AuthenticatedUser,
    adherentId: string,
    annee: number,
  ): Promise<Uint8Array> {
    const compte = await this.getCompteByAdherentId(user, adherentId) as any;
    if (!compte) throw new AppError(404, 'Compte ESR introuvable');
    return genererAvisAnnuelPdf({
      annee,
      nom: String(compte.nom ?? ''),
      prenoms: String(compte.prenoms ?? ''),
      matricule: String(compte.matricule ?? ''),
      capitalAcquis: Number(compte.capital_acquis ?? 0),
      provisionMathematique: Number(compte.pm ?? 0),
      valeurRachat: Number(compte.valeur_rachat ?? 0),
      primesPeriodiques: Number(compte.pp ?? 0),
      cotisationUnique: Number(compte.pu ?? 0),
      dateCalcul: String(compte.date_calcul ?? `${annee}-12-31`),
      versionCalcul: String(compte.version_calc ?? ''),
    });
  },
};
