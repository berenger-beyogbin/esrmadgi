import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { CompteEsrFilters, comptesEsrRepository } from '../repositories/comptes-esr.repository';
import { cotisationsRepository } from '../repositories/cotisations.repository';
import { auditService } from './audit.service';
import {
  calculerProvisionDepuisMouvements,
  calculerValeurRachatDepuisProvision,
  dateArreteDernierTrimestreTermine,
} from './moteur-actuariel.service';
import { reglesActuariellesService } from './regles-actuarielles.service';
import { parametresRepository } from '../repositories/parametres.repository';
import { calculerCotisationUnique } from './moteur-actuariel.service';
import { genererAvisAnnuelPdf, genererReleveComptePdf } from './pdf-document.service';

async function enrichirCapitalConstitutif(
  comptes: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const adherentIds = comptes
    .map((compte) => compte.id_adherent)
    .filter((id): id is number | string => typeof id === 'number' || typeof id === 'string');
  if (adherentIds.length === 0) return comptes;

  const [inputs, mortaliteRows, regles] = await Promise.all([
    comptesEsrRepository.findCapitalInputs(adherentIds),
    parametresRepository.findMortalite() as Promise<Array<Record<string, unknown>>>,
    reglesActuariellesService.getRegles(new Date().toISOString().slice(0, 10)),
  ]);
  const inputsByAdherent = new Map(inputs.map((input) => [String(input.id_adherent), input]));
  const mortalite = mortaliteRows.map((row) => ({ age: Number(row.age_mort), lx: Number(row.lx) }));

  return comptes.map((compte) => {
    const input = inputsByAdherent.get(String(compte.id_adherent));
    if (!input) return { ...compte, capital_constitutif: null };
    const resultat = calculerCotisationUnique({
      renteAnnuelle: Number(input.cotisation_annuelle ?? 0),
      tauxCouverturePourcent: 100,
      ageRetraite: Number(input.age_retraite ?? 0),
      ageMaximum: regles.ageMaximum,
      tauxAnnuelPourcent: Number(input.taux_gar ?? regles.tauxGaranti),
      fraisRentePourcent: Number(input.frais_rente ?? regles.fraisRente),
      nombreTrimestresAvantRetraite: 0,
      mortalite,
    });
    return {
      ...compte,
      capital_constitutif: resultat.statut === 'OK' ? resultat.capitalConstitutif : null,
    };
  });
}

export function repartirCotisationsCompte(cotisations: Array<{ montant: number; source: string }>): {
  primesPeriodiques: number; cotisationUnique: number;
} {
  return cotisations.reduce((totaux, cotisation) => {
    const montant = Number(cotisation.montant ?? 0);
    const source = String(cotisation.source ?? '').toUpperCase();
    if (source === 'COTISATION_UNIQUE' || source === 'UNIQUE') totaux.cotisationUnique += montant;
    else totaux.primesPeriodiques += montant;
    return totaux;
  }, { primesPeriodiques: 0, cotisationUnique: 0 });
}

export const comptesEsrService = {
  async getComptes(user: AuthenticatedUser, filters?: CompteEsrFilters): Promise<unknown[]> {
    const scopedFilters = { ...filters };
    if (user.role === 'ADHERENT') {
      if (!user.matricule) return [];
      scopedFilters.matricule = user.matricule;
    }
    const comptes = await comptesEsrRepository.findComptes(scopedFilters) as Array<Record<string, unknown>>;
    return enrichirCapitalConstitutif(comptes);
  },

  async getCompteByAdherentId(user: AuthenticatedUser, adherentId: string): Promise<unknown | null> {
    if (user.role === 'ADHERENT') {
      if (!user.id_adherent || String(user.id_adherent) !== String(adherentId)) {
        throw new AppError(403, 'Acces refuse au compte ESR de cet adherent');
      }
      const compte = await comptesEsrRepository.findByAdherentId(adherentId, user.matricule) as Record<string, unknown> | null;
      if (!compte) return null;
      return (await enrichirCapitalConstitutif([compte]))[0];
    }
    const compte = await comptesEsrRepository.findByAdherentId(adherentId) as Record<string, unknown> | null;
    if (!compte) return null;
    return (await enrichirCapitalConstitutif([compte]))[0];
  },

  async recalculerCompte(
    user: AuthenticatedUser,
    adherentId: string,
    dateCalcul: string,
  ): Promise<unknown> {
    if (user.role === 'ADHERENT' && (!user.id_adherent || String(user.id_adherent) !== String(adherentId))) {
      throw new AppError(403, 'Acces refuse au recalcul du compte ESR de cet adherent');
    }

    const dateArrete = dateArreteDernierTrimestreTermine(dateCalcul);
    if (!dateArrete) throw new AppError(400, 'Date de calcul invalide');
    const regles = await reglesActuariellesService.getRegles(dateCalcul);
    const cotisations = await cotisationsRepository.findEncaisseesByAdherentId(adherentId, dateArrete);
    const provision = calculerProvisionDepuisMouvements({
      mouvements: cotisations.map((row) => ({
        montant: row.montant,
        dateValeur: row.date_valeur,
      })),
      dateCalcul: dateArrete,
      tauxAnnuelPourcent: regles.tauxGaranti,
    });
    const repartition = repartirCotisationsCompte(cotisations);
    if (provision.statut !== 'OK') {
      throw new AppError(400, 'Impossible de recalculer le compte ESR avec les mouvements disponibles');
    }

    const liquidation = calculerValeurRachatDepuisProvision(
      provision.provisionBrute,
      regles.fraisGestionRachat,
      regles.penaliteRachat,
    );
    const valeurRachat = liquidation.montantNet;
    const effectiveDates = Array.from(new Set(
      Object.values(regles.versions).map((version) => version.dateDebut ?? 'origine'),
    )).sort();
    const versionCalcul = `ESR-PM-2|${effectiveDates.join(',')}`.slice(0, 50);

    const compte = await comptesEsrRepository.saveCalculatedAccount({
      adherentId,
      capitalAcquis: provision.capitalVerse,
      primesPeriodiques: repartition.primesPeriodiques,
      cotisationUnique: repartition.cotisationUnique,
      provisionMathematique: provision.provisionBrute,
      valeurRachat: Math.round((valeurRachat + Number.EPSILON) * 100) / 100,
      dateCalcul: dateArrete,
      versionCalcul,
    });
    const compteEnrichi = (await enrichirCapitalConstitutif([
      compte as Record<string, unknown>,
    ]))[0];

    await auditService.logEvent(user, {
      action: 'RECALCUL_COMPTE_ESR',
      objetAudit: 'COMPTE_ESR',
      idObjet: adherentId,
      details: JSON.stringify({
        dateCalcul,
        dateArrete,
        nombreMouvements: provision.nombreMouvements,
        capitalVerse: provision.capitalVerse,
        primesPeriodiques: repartition.primesPeriodiques,
        cotisationUnique: repartition.cotisationUnique,
        provision: provision.provisionBrute,
        valeurRachat,
        parametres: regles.versions,
      }),
    });

    return {
      compte: compteEnrichi,
      calcul: {
        nombreMouvements: provision.nombreMouvements,
        capitalVerse: provision.capitalVerse,
        primesPeriodiques: repartition.primesPeriodiques,
        cotisationUnique: repartition.cotisationUnique,
        provisionMathematique: provision.provisionBrute,
        valeurRachat: Math.round((valeurRachat + Number.EPSILON) * 100) / 100,
        tauxTrimestriel: provision.tauxTrimestriel,
        dateCalcul: dateArrete,
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
    const periode = `${annee}T4`;
    const historique = await comptesEsrRepository.findHistoriqueAnnuel(adherentId, periode) as any;
    if (!historique) {
      throw new AppError(404, `Avis annuel indisponible : la periode ${periode} n'est pas cloturee`);
    }
    const dateCalcul = String(historique.date_valeur ?? `${annee}-12-31`);
    const mouvements = await cotisationsRepository.findEncaisseesByAdherentId(adherentId, dateCalcul);
    const repartition = repartirCotisationsCompte(mouvements);
    const regles = await reglesActuariellesService.getRegles(dateCalcul);
    const valeurRachatHistorique = calculerValeurRachatDepuisProvision(
      Number(historique.pm ?? 0),
      regles.fraisGestionRachat,
      regles.penaliteRachat,
    ).montantNet;
    return genererAvisAnnuelPdf({
      annee,
      nom: String(compte.nom ?? ''),
      prenoms: String(compte.prenoms ?? ''),
      matricule: String(compte.matricule ?? ''),
      capitalAcquis: Number(historique.capital_cumule ?? 0),
      provisionMathematique: Number(historique.pm ?? 0),
      valeurRachat: valeurRachatHistorique,
      primesPeriodiques: repartition.primesPeriodiques,
      cotisationUnique: repartition.cotisationUnique,
      dateCalcul,
      versionCalcul: String(historique.version_calc ?? ''),
    });
  },

  async genererReleveCompte(user: AuthenticatedUser, adherentId: string): Promise<Uint8Array> {
    const compte = await this.getCompteByAdherentId(user, adherentId) as any;
    if (!compte) throw new AppError(404, 'Compte ESR introuvable');
    const cotisations = await cotisationsRepository.findCotisationsByAdherentId(adherentId) as any[];
    return genererReleveComptePdf({
      nom: String(compte.nom ?? ''),
      prenoms: String(compte.prenoms ?? ''),
      matricule: String(compte.matricule ?? ''),
      dateCalcul: String(compte.date_calcul ?? new Date().toISOString().slice(0, 10)),
      capitalAcquis: Number(compte.capital_acquis ?? 0),
      provisionMathematique: Number(compte.pm ?? 0),
      valeurRachat: Number(compte.valeur_rachat ?? 0),
      cotisations: cotisations.map((row) => ({
        periode: String(row.periode ?? ''),
        montant: Number(row.montant ?? 0),
        dateValeur: String(row.date_valeur ?? row.date_cotisation ?? ''),
        source: String(row.source ?? ''),
      })),
    });
  },
};
