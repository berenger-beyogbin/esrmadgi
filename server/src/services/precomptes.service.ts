import { AppError } from '../middleware/errorHandler';
import { precomptesRepository } from '../repositories/precomptes.repository';
import { AuthenticatedUser } from '../types';
import { auditService } from './audit.service';

function assertPeriode(periode: string): string {
  const normalized = periode.trim().toUpperCase();
  if (!/^\d{4}T[1-4]$/.test(normalized)) {
    throw new AppError(400, 'Format de periode invalide. Attendu : 2026T2');
  }
  return normalized;
}

export const precomptesService = {
  async getPrecomptes(filters?: { search?: string }): Promise<unknown[]> {
    return precomptesRepository.findPrecomptes(filters);
  },

  async getPrecomptesMapByPeriode(periode: string): Promise<Record<string, number>> {
    return precomptesRepository.findPrecompteMapByPeriode(assertPeriode(periode));
  },

  async getNonPrecomptes(periode?: string): Promise<unknown[]> {
    return precomptesRepository.findNonPrecomptes(periode ? assertPeriode(periode) : undefined);
  },

  async enregistrerRetour(
    user: AuthenticatedUser,
    input: {
      periode: string;
      dateRetour: string;
      lignes: Array<{ matricule: string; montantRetour: number; motif?: string }>;
    },
  ): Promise<unknown> {
    const periode = assertPeriode(input.periode);
    let rapproches = 0;
    let ecarts = 0;
    let nonPrecomptes = 0;
    const introuvables: string[] = [];
    const anomalies: Array<{ matricule: string; statut: string; motif: string; montantRetour: number }> = [];

    for (const ligne of input.lignes) {
      const matricule = ligne.matricule.trim().toUpperCase();
      const precompte = await precomptesRepository.findByMatriculeAndPeriode(matricule, periode);
      if (!precompte) {
        introuvables.push(matricule);
        continue;
      }

      const montantDepart = Number(precompte.montant_depart ?? 0);
      const montantRetour = Number(ligne.montantRetour);
      const statutPrecompte = montantRetour <= 0
        ? 'NON_PRECOMPTE'
        : Math.abs(montantRetour - montantDepart) < 0.01
        ? 'ENCAISSE'
        : 'ECART';
      if (statutPrecompte === 'ENCAISSE') rapproches++;
      else if (statutPrecompte === 'ECART') ecarts++;
      else nonPrecomptes++;
      if (statutPrecompte !== 'ENCAISSE') {
        anomalies.push({
          matricule,
          statut: statutPrecompte,
          motif: ligne.motif ?? '',
          montantRetour,
        });
      }

      await precomptesRepository.applyRetour({
        idPrecompte: Number(precompte.id_precompte),
        idCotisationDetail: Number(precompte.id_cotisation_detail),
        montantRetour,
        dateRetour: input.dateRetour,
        statutPrecompte,
        motif: ligne.motif ?? '',
      });
    }

    const resultat = {
      periode,
      dateRetour: input.dateRetour,
      total: input.lignes.length,
      rapproches,
      ecarts,
      nonPrecomptes,
      introuvables,
      anomalies,
    };
    await auditService.logEvent(user, {
      action: 'IMPORT_RETOUR_DGI',
      objetAudit: 'PRECOMPTE',
      idObjet: periode,
      details: JSON.stringify(resultat),
    });
    return resultat;
  },
};
