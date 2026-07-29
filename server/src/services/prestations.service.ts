import { PrestationFilters, PrestationPayload, prestationsRepository } from '../repositories/prestations.repository';
import { AuthenticatedUser } from '../types';
import { auditService } from './audit.service';
import {
  calculerCotisationUnique,
  calculerDecesAvantRetraite,
  calculerDecesPendantRente,
  calculerInvaliditeAvantRetraite,
  calculerProvisionMathematique,
  calculerRachat,
} from './moteur-actuariel.service';
import { reglesActuariellesService } from './regles-actuarielles.service';
import { comptesEsrService } from './comptes-esr.service';
import { genererLiquidationPdf } from './pdf-document.service';
import { AppError } from '../middleware/errorHandler';
import { parametresRepository } from '../repositories/parametres.repository';
import {
  ajouterJoursOuvres,
  ancienneteAnneesCompletes,
  prestationTransitionPermise,
  PrestationWorkflowStatut,
} from './prestation-workflow';

export type CalculPrestationPayload =
  | {
      typeCalcul: 'COTISATION_UNIQUE';
      dateCalcul: string;
      renteAnnuelle: number;
      ageRetraite: number;
      nombreTrimestresAvantRetraite: number;
      adherentId?: string;
    }
  | {
      typeCalcul: 'PROVISION';
      dateCalcul: string;
      cotisationTrimestrielle: number;
      nombreTrimestresCourus: number;
      adherentId?: string;
    }
  | {
      typeCalcul: 'RACHAT';
      dateCalcul: string;
      cotisationTrimestrielle: number;
      nombreTrimestresCourus: number;
      ancienneteAnnees: number;
      adherentId?: string;
    }
  | {
      typeCalcul: 'DECES_AVANT_RETRAITE' | 'INVALIDITE_AVANT_RETRAITE';
      dateCalcul: string;
      cotisationTrimestrielle: number;
      nombreTrimestresCourus: number;
      adherentId?: string;
    }
  | {
      typeCalcul: 'DECES_PENDANT_RENTE';
      dateCalcul: string;
      capitalRestantDu: number;
      adherentId?: string;
    };

export const prestationsService = {
  async getPrestations(filters?: PrestationFilters): Promise<unknown[]> {
    return prestationsRepository.findPrestations(filters);
  },

  async createPrestation(user: AuthenticatedUser, payload: PrestationPayload): Promise<unknown> {
    if (payload.type_prestation === 'RACHAT') {
      const dateSouscription = await prestationsRepository.findAdherentDateSouscription(payload.adherent_id);
      if (!dateSouscription) throw new AppError(400, 'Date de souscription introuvable pour verifier le rachat');
      const reglesRachat = await reglesActuariellesService.getRegles(payload.date_demande);
      const anciennete = ancienneteAnneesCompletes(dateSouscription, payload.date_demande);
      if (anciennete < reglesRachat.delaiMinimumRachatAnnees) {
        await auditService.logEvent(user, {
          action: 'REFUS_RACHAT_NON_ELIGIBLE',
          objetAudit: 'PRESTATION',
          idObjet: payload.adherent_id,
          details: JSON.stringify({
            dateSouscription,
            dateDemande: payload.date_demande,
            anciennete,
            minimum: reglesRachat.delaiMinimumRachatAnnees,
          }),
        });
        throw new AppError(
          400,
          `Rachat interdit avant ${reglesRachat.delaiMinimumRachatAnnees} annees de souscription`,
        );
      }
    }
    const recalcul = await comptesEsrService.recalculerCompte(
      user,
      payload.adherent_id,
      payload.date_demande,
    ) as {
      calcul: {
        capitalVerse: number;
        provisionMathematique: number;
        valeurRachat: number;
      };
    };
    const regles = await reglesActuariellesService.getRegles(payload.date_demande);

    const montantCalcule = (() => {
      switch (payload.type_prestation) {
        case 'RACHAT':
          return recalcul.calcul.valeurRachat;
        case 'DECES':
          return recalcul.calcul.provisionMathematique * regles.tauxDecesAvantRetraite / 100;
        case 'INVALIDITE':
          return recalcul.calcul.provisionMathematique * regles.tauxInvaliditeAvantRetraite / 100;
        case 'RETRAITE':
          return recalcul.calcul.provisionMathematique;
        default:
          return 0;
      }
    })();
    const montant = Math.round((montantCalcule + Number.EPSILON) * 100) / 100;

    const prestation = await prestationsRepository.createPrestation({
      ...payload,
      montant,
    });
    await auditService.logEvent(user, {
      action: 'CREATION_PRESTATION_CALCULEE',
      objetAudit: 'PRESTATION',
      idObjet: payload.adherent_id,
      details: JSON.stringify({
        type: payload.type_prestation,
        montant,
        dateCalcul: payload.date_demande,
        compte: recalcul.calcul,
        parametres: regles.versions,
      }),
    });
    return prestation;
  },

  async calculerPrestation(user: AuthenticatedUser, payload: CalculPrestationPayload): Promise<unknown> {
    const regles = await reglesActuariellesService.getRegles(payload.dateCalcul);
    let resultat: unknown;

    switch (payload.typeCalcul) {
      case 'COTISATION_UNIQUE': {
        const mortalite = await parametresRepository.findMortalite() as Array<{
          age_mort: number;
          lx: number;
        }>;
        resultat = calculerCotisationUnique({
          renteAnnuelle: payload.renteAnnuelle,
          tauxCouverturePourcent: regles.tauxCouvertureRetraite,
          ageRetraite: payload.ageRetraite,
          ageMaximum: regles.ageMaximum,
          tauxAnnuelPourcent: regles.tauxGaranti,
          fraisRentePourcent: regles.fraisRente,
          nombreTrimestresAvantRetraite: payload.nombreTrimestresAvantRetraite,
          mortalite: mortalite.map((row) => ({ age: Number(row.age_mort), lx: Number(row.lx) })),
        });
        break;
      }
      case 'PROVISION':
        resultat = calculerProvisionMathematique({
          cotisationTrimestrielle: payload.cotisationTrimestrielle,
          nombreTrimestresCourus: payload.nombreTrimestresCourus,
          tauxAnnuelPourcent: regles.tauxGaranti,
        });
        break;
      case 'RACHAT':
        resultat = calculerRachat({
          cotisationTrimestrielle: payload.cotisationTrimestrielle,
          nombreTrimestresCourus: payload.nombreTrimestresCourus,
          tauxAnnuelPourcent: regles.tauxGaranti,
          fraisGestionPourcent: regles.fraisGestionRachat,
          penalitePourcent: regles.penaliteRachat,
          ancienneteAnnees: payload.ancienneteAnnees,
          ancienneteMinimaleAnnees: regles.delaiMinimumRachatAnnees,
        });
        break;
      case 'DECES_AVANT_RETRAITE':
        resultat = calculerDecesAvantRetraite({
          cotisationTrimestrielle: payload.cotisationTrimestrielle,
          nombreTrimestresCourus: payload.nombreTrimestresCourus,
          tauxAnnuelPourcent: regles.tauxGaranti,
          tauxVersementPourcent: regles.tauxDecesAvantRetraite,
        });
        break;
      case 'INVALIDITE_AVANT_RETRAITE':
        resultat = calculerInvaliditeAvantRetraite({
          cotisationTrimestrielle: payload.cotisationTrimestrielle,
          nombreTrimestresCourus: payload.nombreTrimestresCourus,
          tauxAnnuelPourcent: regles.tauxGaranti,
          tauxVersementPourcent: regles.tauxInvaliditeAvantRetraite,
        });
        break;
      case 'DECES_PENDANT_RENTE':
        resultat = calculerDecesPendantRente({
          capitalRestantDu: payload.capitalRestantDu,
          tauxVersementPourcent: regles.tauxDecesPendantRente,
        });
        break;
    }

    const calcul = {
      typeCalcul: payload.typeCalcul,
      dateCalcul: payload.dateCalcul,
      adherentId: payload.adherentId ?? null,
      entrees: payload,
      resultat,
      parametres: regles.versions,
    };

    await auditService.logEvent(user, {
      action: `CALCUL_${payload.typeCalcul}`,
      objetAudit: 'CALCUL_ACTUARIEL',
      idObjet: payload.adherentId ?? null,
      details: JSON.stringify(calcul),
    });

    return calcul;
  },

  async getRentes(): Promise<unknown[]> {
    return prestationsRepository.findRentes();
  },

  async changerStatut(
    user: AuthenticatedUser,
    id: string,
    nouveauStatut: PrestationWorkflowStatut,
    observation: string,
  ): Promise<unknown> {
    const prestation = await prestationsRepository.findById(id);
    if (!prestation) throw new AppError(404, 'Prestation introuvable');
    const actuel = String(prestation.statut_prestation) as PrestationWorkflowStatut;
    if (!prestationTransitionPermise(actuel, nouveauStatut)) {
      throw new AppError(400, `Transition de prestation interdite : ${actuel} vers ${nouveauStatut}`);
    }
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const dates = nouveauStatut === 'VALIDE'
      ? { date_validation: aujourdHui }
      : nouveauStatut === 'PAYE'
        ? { date_paiement: aujourdHui }
        : {};
    const updated = await prestationsRepository.updateStatut(id, nouveauStatut, dates);
    await auditService.logEvent(user, {
      action: `PRESTATION_${nouveauStatut}`,
      objetAudit: 'PRESTATION',
      idObjet: id,
      details: JSON.stringify({
        ancienStatut: actuel,
        nouveauStatut,
        observation,
        dateCompletude: nouveauStatut === 'EN_CONTROLE' ? aujourdHui : undefined,
        echeancePaiement: nouveauStatut === 'EN_CONTROLE'
          ? ajouterJoursOuvres(aujourdHui, 15)
          : undefined,
      }),
    });
    return updated;
  },

  async getRenteVersements(renteId: string): Promise<unknown[]> {
    return prestationsRepository.findRenteVersements(renteId);
  },

  async genererLiquidation(id: string): Promise<Uint8Array> {
    const prestation = await prestationsRepository.findById(id);
    if (!prestation) throw new AppError(404, 'Prestation introuvable');
    return genererLiquidationPdf({
      numero: `ESR-PRES-${String(id).padStart(6, '0')}`,
      type: String(prestation.type_prestation),
      nom: String(prestation.nom ?? ''),
      prenoms: String(prestation.prenoms ?? ''),
      matricule: String(prestation.matricule ?? ''),
      dateDemande: String(prestation.date_demande ?? ''),
      montant: Number(prestation.montant ?? 0),
      statut: String(prestation.statut_prestation ?? ''),
    });
  },
};
