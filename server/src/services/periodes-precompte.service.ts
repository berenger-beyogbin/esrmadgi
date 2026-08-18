import { AuthenticatedUser } from '../types';
import { periodesRepository, PeriodeMetier } from '../repositories/periodes-precompte.repository';
import { assertPeriode } from '../utils/periode';
import { auditService } from './audit.service';
import { AppError } from '../middleware/errorHandler';
import { cotisationsRepository } from '../repositories/cotisations.repository';
import { calculerProvisionDepuisMouvements, calculerValeurRachatDepuisProvision } from './moteur-actuariel.service';
import { reglesActuariellesService } from './regles-actuarielles.service';
import { comptesEsrRepository } from '../repositories/comptes-esr.repository';

export interface ControleCloture {
  periode: string;
  statut: 'OUVERTE' | 'CLOTUREE';
  dateCloturePrevue: string;
  synthese: {
    adherentsConcernes: number;
    precomptesAttendus: number;
    precomptesEncaisses: number;
    precomptesRegularises: number;
    paiementsSpontanes: number;
  };
  controles: {
    cotisationsToutesEncaissees: boolean;
    paiementsAvecDateValeur: boolean;
    precomptesTousTraites: boolean;
  };
  clotureAutorisee: boolean;
  infrastructurePrete: boolean;
  alertes: string[];
}

export function dateValeurSuivante(annee: number, trimestre: number): string {
  const nextYear = trimestre === 4 ? annee + 1 : annee;
  const nextQuarter = trimestre === 4 ? 1 : trimestre + 1;
  return `${nextYear}-${String((nextQuarter - 1) * 3 + 1).padStart(2, '0')}-01`;
}

export function dateArreteTrimestre(annee: number, trimestre: number): string {
  return new Date(Date.UTC(annee, trimestre * 3, 0)).toISOString().slice(0, 10);
}

export function estPaiementSpontane(item: { source?: unknown; statut_detail?: unknown }): boolean {
  return ['SPONTANEE', 'DIRECT'].includes(String(item.source ?? '').toUpperCase())
    && String(item.statut_detail ?? '').toUpperCase() === 'ENCAISSEE';
}

export const periodesService = {
  async getPeriodes(): Promise<PeriodeMetier[]> {
    return periodesRepository.findAll();
  },

  async getPeriodesOuvertes(): Promise<PeriodeMetier[]> {
    await periodesRepository.upsertPeriodeCourante();
    return periodesRepository.findOuvertes();
  },

  async getControleCloture(periode: string): Promise<ControleCloture> {
    const normalized = assertPeriode(periode);
    const row = await periodesRepository.findByPeriode(normalized);
    if (!row) throw new AppError(404, 'Periode introuvable.');
    const [{ adherents, precomptes, cotisations, regularisations }, infrastructurePrete] = await Promise.all([
      periodesRepository.getClotureData(normalized),
      periodesRepository.infrastructureClotureDisponible(),
    ]);
    const detailsPrecompteEncaisses = new Set(
      cotisations
        .filter((item) => String(item.source).toUpperCase() === 'PRECOMPTE'
          && String(item.statut_detail).toUpperCase() === 'ENCAISSEE')
        .map((item) => String(item.id_cotisation_detail)),
    );
    const encaisses = precomptes.filter((item) =>
      detailsPrecompteEncaisses.has(String(item.id_cotisation_detail)));
    const montantRegulariseParPrecompte = new Map<string, number>();
    for (const item of regularisations) {
      const key = String(item.id_precompte);
      montantRegulariseParPrecompte.set(key, (montantRegulariseParPrecompte.get(key) ?? 0) + Number(item.montant ?? 0));
    }
    const regularises = precomptes.filter((item) =>
      !detailsPrecompteEncaisses.has(String(item.id_cotisation_detail))
      && (montantRegulariseParPrecompte.get(String(item.id_precompte)) ?? 0) >= Number(item.montant_depart) - 0.01);
    const precompteIdsRegles = new Set([...encaisses, ...regularises].map((item) => String(item.id_precompte)));
    const nonEncaisses = precomptes.filter((item) => !precompteIdsRegles.has(String(item.id_precompte)));
    const detailIdsRegularisation = new Set(regularisations.map((item) => String(item.id_cotisation_detail)));
    const spontanees = cotisations.filter(estPaiementSpontane);
    const spontaneesPures = spontanees.filter((item) => !detailIdsRegularisation.has(String(item.id_cotisation_detail)));
    const cotisationsToutesEncaissees = precomptes.length > 0 && nonEncaisses.length === 0;
    const cotisationsEncaissees = cotisations.filter((item) =>
      String(item.statut_detail).toUpperCase() === 'ENCAISSEE');
    const paiementsAvecDateValeur = [...cotisationsEncaissees, ...regularisations].every((item) => Boolean(item.date_valeur));
    const precomptesTousTraites = precomptes.length > 0 && precomptes.every((item) =>
      !['GENERE', 'INITIE'].includes(String(item.statut_precompte)));
    const alertes: string[] = [];
    if (!cotisationsToutesEncaissees) {
      const count = nonEncaisses.length;
      alertes.push(precomptes.length === 0
        ? `Aucun précompte n'a été généré pour la période ${normalized}.`
        : `${count} cotisation${count > 1 ? 's' : ''} prévue${count > 1 ? 's' : ''} non encaissée${count > 1 ? 's' : ''}.`);
    }
    if (!paiementsAvecDateValeur) {
      const count = cotisationsEncaissees.filter((item) => !item.date_valeur).length;
      alertes.push(`${count} paiement${count > 1 ? 's' : ''} encaissé${count > 1 ? 's' : ''} sans date de valeur.`);
    }
    if (!precomptesTousTraites) alertes.push('Certains précomptes ne sont pas encore traités.');
    if (!infrastructurePrete) alertes.push("La migration de clôture ESR n'est pas encore installée dans Supabase.");
    const controles = { cotisationsToutesEncaissees, paiementsAvecDateValeur, precomptesTousTraites };
    return {
      periode: normalized,
      statut: row.statut,
      dateCloturePrevue: row.date_cloture_prevue ?? dateArreteTrimestre(row.annee, row.trimestre),
      synthese: {
        adherentsConcernes: adherents.length,
        precomptesAttendus: precomptes.length,
        precomptesEncaisses: encaisses.length,
        precomptesRegularises: regularises.length,
        paiementsSpontanes: spontaneesPures.length,
      },
      controles,
      clotureAutorisee: infrastructurePrete && row.statut === 'OUVERTE' && Object.values(controles).every(Boolean),
      infrastructurePrete,
      alertes,
    };
  },

  async cloturerPeriode(user: AuthenticatedUser, periode: string): Promise<{ periode_suivante: string }> {
    const normalized = assertPeriode(periode);
    const controle = await this.getControleCloture(normalized);
    if (!controle.infrastructurePrete) {
      throw new AppError(503, "La clôture est indisponible : appliquez d'abord les migrations SQL ESR dans Supabase.");
    }
    if (!controle.clotureAutorisee) {
      throw new AppError(409, `Cloture impossible : ${controle.alertes.join(' ') || 'les controles prealables ont echoue.'}`);
    }
    const row = await periodesRepository.findByPeriode(normalized);
    if (!row) throw new AppError(404, 'Periode introuvable.');
    // La situation actuarielle est arretee au dernier jour du trimestre.
    // Utiliser le premier jour du trimestre suivant ajoutait une periode
    // supplementaire dans le moteur de capitalisation par mouvements.
    const dateValeur = dateArreteTrimestre(row.annee, row.trimestre);
    const data = await periodesRepository.getClotureData(normalized);
    const regles = await reglesActuariellesService.getRegles(dateValeur);
    const effectiveDates = Array.from(new Set(
      Object.values(regles.versions).map((version) => version.dateDebut ?? 'origine'),
    )).sort();
    const versionCalcul = `ESR-PM-2|${effectiveDates.join(',')}`.slice(0, 50);
    const snapshots = [];
    for (const adherent of data.adherents) {
      const idAdherent = String(adherent.id_adherent);
      const mouvements = await cotisationsRepository.findEncaisseesByAdherentId(idAdherent, dateValeur);
      const calcul = calculerProvisionDepuisMouvements({
        mouvements: mouvements.map((item) => ({ montant: item.montant, dateValeur: item.date_valeur })),
        dateCalcul: dateValeur,
        tauxAnnuelPourcent: regles.tauxGaranti,
      });
      if (calcul.statut !== 'OK') throw new AppError(409, `Calcul actuariel impossible pour l'adherent ${idAdherent}.`);
      const montantCotise = data.cotisations
        .filter((item) => String(item.id_adherent) === idAdherent && String(item.statut_detail) === 'ENCAISSEE')
        .reduce((sum, item) => sum + Number(item.montant ?? 0), 0);
      const valeurRachat = calculerValeurRachatDepuisProvision(
        calcul.provisionBrute,
        regles.fraisGestionRachat,
        regles.penaliteRachat,
      ).montantNet;
      snapshots.push({
        id_adherent: Number(idAdherent),
        capital_acquis: calcul.capitalVerse,
        provision_mathematique: calcul.provisionBrute,
        montant_cotise: montantCotise,
        interets_credites: Math.max(0, calcul.provisionBrute - calcul.capitalVerse),
        valeur_rachat: Math.round((valeurRachat + Number.EPSILON) * 100) / 100,
        taux_technique: regles.tauxGaranti,
        date_valeur: dateValeur,
        version_calc: versionCalcul,
      });
    }
    const result = await periodesRepository.cloturerAtomiquement({
      periode: normalized,
      userId: user.auth_user_id,
      snapshots,
      resume: {
        nb_adherents: snapshots.length,
        capital_global: snapshots.reduce((sum, item) => sum + item.capital_acquis, 0),
        pm_totale: snapshots.reduce((sum, item) => sum + item.provision_mathematique, 0),
        version_calc: versionCalcul,
      },
    });
    for (const snapshot of snapshots) {
      await comptesEsrRepository.actualiserRepartition(String(snapshot.id_adherent));
    }
    await auditService.logEvent(user, {
      action: 'CLOTURE_PERIODE',
      objetAudit: 'PERIODE',
      idObjet: normalized,
      details: JSON.stringify({ periode: normalized, periodeSuivante: result.periode_suivante, nbAdherents: snapshots.length }),
    });
    return result;
  },

  async creerPeriode(user: AuthenticatedUser, annee: number, trimestre: number): Promise<PeriodeMetier> {
    const created = await periodesRepository.create(annee, trimestre);
    await auditService.logEvent(user, {
      action: 'CREATION_PERIODE',
      objetAudit: 'PERIODE',
      idObjet: created.periode,
      details: JSON.stringify({ periode: created.periode, annee, trimestre }),
    });
    return created;
  },
};
