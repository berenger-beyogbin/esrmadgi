import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { promotionRetraiteExistantsRepository } from '../repositories/promotion-retraite-existants.repository';
import { parametresRepository } from '../repositories/parametres.repository';
import { calculerNombreTrimestres } from './regle-retraite.service';
import { calculerAbattementPromo, FenetrePromo } from './promotion-depart-retraite.service';
import { auditService } from './audit.service';

export interface AdherentEligiblePromo {
  id_adherent: number;
  id_info_cotisation: number;
  matricule: string;
  nom: string;
  prenoms: string;
  grade: string;
  date_retraite: string;
  nb_trimestre_restant: number;
  palier_abattement_promo: number;
  taux_abattement_promo: number;
  cotisation_es_avant_abattement: number;
  cotisation_es_apres_abattement: number;
}

function actor(user: AuthenticatedUser): string {
  return user.email || user.matricule || user.id_utilisateur;
}

async function resoudreFenetrePromo(): Promise<FenetrePromo | null> {
  const promoParam = (await parametresRepository.findParametreGeneralByCode('PROMO_ABATTEMENT_RETRAITE')) as
    | { actif?: boolean; date_debut?: string | null; date_fin?: string | null }
    | null;
  if (!promoParam) return null;
  return {
    actif: Boolean(promoParam.actif),
    date_debut: promoParam.date_debut ?? null,
    date_fin: promoParam.date_fin ?? null,
  };
}

async function calculerEligibles(): Promise<AdherentEligiblePromo[]> {
  const [candidats, fenetre] = await Promise.all([
    promotionRetraiteExistantsRepository.findCandidats(),
    resoudreFenetrePromo(),
  ]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return candidats
    .map((candidat) => {
      const nbTrimestreRestant = calculerNombreTrimestres(todayIso, candidat.date_retraite);
      const abattement = calculerAbattementPromo({
        libelleGrade: candidat.grade,
        nbTrimestreRestant,
        cotisationTrimestrielleStandard: Number(candidat.cotisation_es),
        dateReference: todayIso,
        fenetre,
      });
      if (!abattement.applique || abattement.palier == null || abattement.tauxPourcent == null) return null;

      const eligible: AdherentEligiblePromo = {
        id_adherent: candidat.id_adherent,
        id_info_cotisation: candidat.id_info_cotisation,
        matricule: candidat.matricule,
        nom: candidat.nom,
        prenoms: candidat.prenoms,
        grade: candidat.grade,
        date_retraite: candidat.date_retraite,
        nb_trimestre_restant: nbTrimestreRestant,
        palier_abattement_promo: abattement.palier,
        taux_abattement_promo: abattement.tauxPourcent,
        cotisation_es_avant_abattement: Number(candidat.cotisation_es),
        cotisation_es_apres_abattement: abattement.cotisationApresAbattement,
      };
      return eligible;
    })
    .filter((row): row is AdherentEligiblePromo => row !== null)
    .sort((a, b) => a.nb_trimestre_restant - b.nb_trimestre_restant);
}

export const promotionRetraiteExistantsService = {
  async previsualiser(): Promise<AdherentEligiblePromo[]> {
    return calculerEligibles();
  },

  async appliquer(user: AuthenticatedUser, idsAdherent?: number[]): Promise<{ appliques: AdherentEligiblePromo[] }> {
    const eligibles = await calculerEligibles();
    const cible =
      idsAdherent && idsAdherent.length > 0
        ? eligibles.filter((row) => idsAdherent.includes(row.id_adherent))
        : eligibles;

    if (cible.length === 0) {
      throw new AppError(400, "Aucun adherent eligible a l'offre promotionnelle parmi la selection.");
    }

    for (const row of cible) {
      await promotionRetraiteExistantsRepository.appliquerAbattement(row.id_info_cotisation, {
        cotisation_es: row.cotisation_es_apres_abattement,
        cotisation_es_avant_abattement: row.cotisation_es_avant_abattement,
        taux_abattement_promo: row.taux_abattement_promo,
        palier_abattement_promo: row.palier_abattement_promo,
      });
    }

    await auditService
      .logEvent(user, {
        action: 'PROMO_RETRAITE_APPLIQUEE',
        objetAudit: 'ADHERENT',
        idObjet: 'BULK',
        details: `Abattement promo depart retraite applique par ${actor(user)} a ${cible.length} adherent(s) : ${cible
          .map((row) => row.matricule)
          .join(', ')}.`,
      })
      .catch(() => undefined);

    return { appliques: cible };
  },
};
