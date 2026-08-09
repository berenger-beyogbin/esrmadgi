import { PaiementPayload, paiementsRepository } from '../repositories/paiements.repository';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { auditService } from './audit.service';
import { cotisationsService } from './cotisations.service';
import { genererRecuPaiementPdf } from './pdf-document.service';
import {
  paiementTransitionPermise,
  paiementWorkflowStatus,
  PaiementWorkflowStatut,
} from './paiement-workflow';

export const paiementsService = {
  async getPaiements(): Promise<unknown[]> {
    const paiements = await paiementsRepository.findPaiements() as Array<Record<string, unknown>>;
    const logs = await auditService.getLogs({ objetAudit: 'PAIEMENT' }) as Array<{
      action?: string;
      id_objet?: string | null;
    }>;
    return paiements.map((paiement) => ({
      ...paiement,
      statut_workflow: paiementWorkflowStatus(
        logs.filter((log) => String(log.id_objet ?? '') === String(paiement.id)),
      ),
    }));
  },

  async createPaiement(user: AuthenticatedUser, payload: PaiementPayload): Promise<unknown> {
    const paiement = await paiementsRepository.createPaiement(payload) as { id?: string | number };
    await auditService.logEvent(user, {
      action: 'PAIEMENT_SAISI',
      objetAudit: 'PAIEMENT',
      idObjet: paiement.id ?? null,
      details: JSON.stringify({ moyen: payload.moyen, montant: payload.montant_paiement }),
    });
    return { ...paiement, statut_workflow: 'SAISI' };
  },

  async changerStatut(
    user: AuthenticatedUser,
    id: string,
    nouveauStatut: PaiementWorkflowStatut,
    observation: string,
    donnees: Record<string, unknown> = {},
  ): Promise<unknown> {
    const paiement = await paiementsRepository.findById(id);
    if (!paiement) throw new AppError(404, 'Paiement introuvable');
    const logs = await auditService.getLogs({ objetAudit: 'PAIEMENT', idObjet: id }) as unknown[];
    const current = paiementWorkflowStatus(logs);
    if (!paiementTransitionPermise(current, nouveauStatut)) {
      throw new AppError(400, `Transition de paiement interdite : ${current} vers ${nouveauStatut}`);
    }

    const estCheque = String(paiement.moyen).toUpperCase() === 'CHEQUE';
    if (estCheque && current === 'CONTROLE' && nouveauStatut === 'VALIDE') {
      throw new AppError(400, 'Un cheque doit etre depose puis compense avant validation');
    }
    if (estCheque && nouveauStatut === 'DEPOSE_BANQUE') {
      if (!donnees.reference_bordereau || !donnees.date_depot_banque) {
        throw new AppError(400, 'Reference du bordereau et date de depot obligatoires');
      }
      await paiementsRepository.updateChequeValidation(id, {
        reference_bordereau: String(donnees.reference_bordereau),
        date_depot_banque: String(donnees.date_depot_banque),
      });
    }
    if (estCheque && nouveauStatut === 'COMPENSE') {
      if (!donnees.reference_avis_credit || !donnees.date_compensation) {
        throw new AppError(400, 'Reference bancaire et date de compensation obligatoires');
      }
      await paiementsRepository.updateChequeValidation(id, {
        reference_avis_credit: String(donnees.reference_avis_credit),
        date_compensation: String(donnees.date_compensation),
        date_valeur: String(donnees.date_compensation),
      });
    }
    if (nouveauStatut === 'REJETE_BANQUE') {
      await paiementsRepository.updateChequeValidation(id, {
        motif_rejet: String(donnees.motif_rejet ?? observation),
      });
    }

    if (nouveauStatut === 'ENCAISSE') {
      await cotisationsService.createCotisationSpontanee({
        id_adherent: Number(paiement.adherent_id),
        mode: String(paiement.moyen),
        date: String(paiement.date_compensation ?? paiement.date_valeur ?? paiement.date_paiement),
        montant: Number(paiement.montant_paiement),
        id_precompte: paiement.id_precompte ? Number(paiement.id_precompte) : undefined,
      });
    }

    await auditService.logEvent(user, {
      action: `PAIEMENT_${nouveauStatut}`,
      objetAudit: 'PAIEMENT',
      idObjet: id,
      details: JSON.stringify({ ancienStatut: current, nouveauStatut, observation }),
    });
    return { ...paiement, statut_workflow: nouveauStatut };
  },

  async genererRecu(id: string): Promise<Uint8Array> {
    const paiement = await paiementsRepository.findById(id);
    if (!paiement) throw new AppError(404, 'Paiement introuvable');
    const logs = await auditService.getLogs({ objetAudit: 'PAIEMENT', idObjet: id }) as unknown[];
    if (paiementWorkflowStatus(logs) !== 'ENCAISSE') {
      throw new AppError(400, 'Le reçu est disponible uniquement après encaissement');
    }
    const details = (await paiementsRepository.findPaiements() as any[])
      .find((row) => String(row.id) === String(id)) ?? paiement;
    return genererRecuPaiementPdf({
      numero: `ESR-PAY-${String(id).padStart(6, '0')}`,
      nom: details.nom_adherent,
      prenoms: details.prenoms_adherent,
      matricule: details.matricule,
      montant: Number(paiement.montant_paiement),
      datePaiement: String(paiement.date_paiement),
      dateValeur: String(paiement.date_valeur),
      moyen: String(paiement.moyen),
      origine: String(paiement.origine_paiement),
    });
  },
};
