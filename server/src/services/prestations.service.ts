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
import {
  bornesTrimestre,
  calculerEcheanceTrimestrielle,
  echeanceApsTransitionPermise,
  EcheanceApsStatut,
} from './rente-sante-workflow';

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
      throw new AppError(400, 'Le rachat doit etre traite dans le module Rachat, pas dans Prestations');
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
    let renteCreee: unknown = null;
    if (nouveauStatut === 'VALIDE' && String(prestation.type_prestation) === 'RETRAITE') {
      const adherent = await prestationsRepository.findAdherentForRente(String(prestation.adherent_id));
      if (!adherent?.date_retraite) throw new AppError(400, 'Date de retraite introuvable');
      if (String(adherent.date_retraite) > aujourdHui) {
        throw new AppError(400, 'La rente ne peut pas etre activee avant la date de retraite');
      }
      if (adherent.decede === true) throw new AppError(400, 'Impossible d’activer une rente pour un adherent decede');
      const regles = await reglesActuariellesService.getRegles(aujourdHui);
      const cotisationAnnuelle = Number(adherent.cotisation_annuelle ?? 0);
      if (cotisationAnnuelle <= 0) throw new AppError(400, 'Cotisation maladie annuelle absente');
      const montantTrimestriel = calculerEcheanceTrimestrielle(
        cotisationAnnuelle,
        regles.tauxCouvertureRetraite,
      );
      renteCreee = await prestationsRepository.createRenteFromPrestation({
        prestationId: id,
        adherentId: String(prestation.adherent_id),
        dateEffet: String(adherent.date_retraite),
        dateRetraite: String(adherent.date_retraite),
        capitalInitial: Number(prestation.montant ?? 0),
        cotisationAnnuelle,
        montantTrimestriel,
        tauxCouverture: regles.tauxCouvertureRetraite,
        tauxFraisGestion: regles.fraisRente,
        versionCalcul: JSON.stringify(regles.versions),
      });
    }
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
    return { prestation: updated, rente: renteCreee };
  },

  async getRenteVersements(renteId: string): Promise<unknown[]> {
    return prestationsRepository.findRenteVersements(renteId);
  },

  async getEcheances(filters?: { annee?: number; trimestre?: number; statut?: string }): Promise<unknown[]> {
    return prestationsRepository.findEcheances(filters);
  },

  async genererEcheances(
    user: AuthenticatedUser,
    payload: { annee: number; trimestre: number },
  ): Promise<unknown> {
    const bornes = bornesTrimestre(payload.annee, payload.trimestre);
    const rentes = await prestationsRepository.findActiveRentes();
    const lignes = rentes
      .filter((r) => !r.date_effet || String(r.date_effet) <= bornes.fin)
      .filter((r) => !r.date_extinction || String(r.date_extinction) >= bornes.debut)
      .map((r) => {
        const montant = Number(r.montant_trimestriel ?? 0);
        return {
          id_rente: r.id_rente,
          annee: payload.annee,
          trimestre: payload.trimestre,
          periode: `${payload.annee}-T${payload.trimestre}`,
          date_echeance: bornes.debut,
          date_versement: bornes.debut,
          montant,
          montant_brut: montant,
          montant_a_payer: montant,
          frais_gestion: 0,
          organisme_beneficiaire: r.organisme_beneficiaire || 'APS',
          statut: 'GENEREE',
        };
      });
    const created = await prestationsRepository.createEcheances(lignes);
    await auditService.logEvent(user, {
      action: 'GENERATION_ECHEANCES_APS', objetAudit: 'RENTE', idObjet: null,
      details: JSON.stringify({ ...payload, rentesEligibles: lignes.length, creees: created.length }),
    });
    return { periode: `${payload.annee}-T${payload.trimestre}`, eligibles: lignes.length, creees: created.length };
  },

  async changerStatutEcheance(
    user: AuthenticatedUser, id: string, statut: EcheanceApsStatut, observation: string,
  ): Promise<unknown> {
    const echeance = await prestationsRepository.findEcheanceById(id);
    if (!echeance) throw new AppError(404, 'Echeance APS introuvable');
    const actuel = String(echeance.statut) as EcheanceApsStatut;
    if (!echeanceApsTransitionPermise(actuel, statut)) {
      throw new AppError(400, `Transition d'echeance interdite : ${actuel} vers ${statut}`);
    }
    const updated = await prestationsRepository.updateEcheanceStatut(id, statut, observation);
    await auditService.logEvent(user, {
      action: `ECHEANCE_APS_${statut}`, objetAudit: 'RENTE_VERSEMENT', idObjet: id,
      details: JSON.stringify({ ancienStatut: actuel, nouveauStatut: statut, observation }),
    });
    return updated;
  },

  async payerEcheance(user: AuthenticatedUser, id: string, paiement: {
    datePaiement: string; referencePaiement: string; modePaiement: string; pieceJustificative?: string;
  }): Promise<unknown> {
    const result = await prestationsRepository.payerEcheance(id, paiement);
    await auditService.logEvent(user, {
      action: 'ECHEANCE_APS_PAYEE', objetAudit: 'RENTE_VERSEMENT', idObjet: id,
      details: JSON.stringify(paiement),
    });
    return result;
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
