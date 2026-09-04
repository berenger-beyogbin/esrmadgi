import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import {
  ActiveAdherentForCotisation,
  CotisationFilters,
  CotisationSpontaneePayload,
  ParsedTrimestre,
  cotisationsRepository,
} from '../repositories/cotisations.repository';
import { precomptesRepository } from '../repositories/precomptes.repository';
import { periodesRepository } from '../repositories/periodes-precompte.repository';
import { parametresRepository } from '../repositories/parametres.repository';
import { reglesActuariellesService } from './regles-actuarielles.service';
import { calculerCotisationTrimestrielleApresSpontanee } from './moteur-actuariel.service';

export interface GeneratePrecomptesResult {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface SimulationCotisationSpontaneeResult {
  idAdherent: number;
  matricule: string;
  montantSpontane: number;
  cotisationTrimestrielleActuelle: number;
  nouvelleCotisationTrimestrielle: number;
  reductionTrimestrielle: number;
  capitalAcquisAvant: number;
  capitalAcquisApres: number;
  capitalConstitutif: number;
  capitalRestant: number;
  nombreTrimestres: number;
}

function parsePeriodeTrimestre(periode: string): ParsedTrimestre | null {
  const match = periode.trim().match(/^(\d{4})T([1-4])$/i);
  if (!match) return null;

  const annee = parseInt(match[1], 10);
  const trimestre = parseInt(match[2], 10);
  const debuts: Record<number, string> = { 1: '01-01', 2: '04-01', 3: '07-01', 4: '10-01' };
  const fins: Record<number, string> = { 1: '03-31', 2: '06-30', 3: '09-30', 4: '12-31' };

  return {
    annee,
    trimestre,
    periodeDeb: `${annee}-${debuts[trimestre]}`,
    periodeFin: `${annee}-${fins[trimestre]}`,
  };
}

export function estEligibleAuPrecomptePourPeriode(
  adherent: { cotisation_es?: unknown; date_precompte?: unknown },
  dateFinPeriode: string,
): boolean {
  const datePremierPrecompte = String(adherent.date_precompte ?? '').trim();
  return Number(adherent.cotisation_es) > 0
    && /^\d{4}-\d{2}-\d{2}$/.test(datePremierPrecompte)
    && datePremierPrecompte <= dateFinPeriode;
}

export function calculerCotisationNette(montantBrut: number, creditSpontane: number): number {
  if (!Number.isFinite(montantBrut) || !Number.isFinite(creditSpontane) || montantBrut < 0 || creditSpontane < 0) {
    throw new Error('Montant de cotisation ou credit spontane invalide');
  }
  return Math.round((Math.max(montantBrut - creditSpontane, 0) + Number.EPSILON) * 100) / 100;
}

export function dateValeurCotisationSpontanee(annee: number, trimestre: number): string {
  const anneeValeur = trimestre === 4 ? annee + 1 : annee;
  const moisValeur = trimestre === 4 ? 1 : trimestre * 3 + 1;
  return `${anneeValeur}-${String(moisValeur).padStart(2, '0')}-01`;
}

function assertOwnAdherent(user: AuthenticatedUser, idAdherent: string | number): void {
  if (user.role !== 'ADHERENT') return;
  if (!user.id_adherent || String(user.id_adherent) !== String(idAdherent)) {
    throw new AppError(403, 'Acces refuse aux cotisations de cet adherent');
  }
}

function assertOwnMatricule(user: AuthenticatedUser, matricule: string): void {
  if (user.role !== 'ADHERENT') return;
  if (!user.matricule || user.matricule.toUpperCase() !== matricule.toUpperCase()) {
    throw new AppError(403, 'Acces refuse aux cotisations de ce matricule');
  }
}

function normalizeActiveAdherent(adherent: ActiveAdherentForCotisation | null): ActiveAdherentForCotisation {
  if (!adherent) {
    throw new AppError(404, 'Adherent introuvable');
  }
  if (adherent.statut !== true || adherent.decede === true || adherent.retraite === true) {
    throw new AppError(400, 'Adherent non eligible a cette cotisation');
  }
  if (!adherent.matricule) {
    throw new AppError(400, 'Matricule adherent introuvable');
  }
  return adherent;
}

function buildReference(prefix: 'SP' | 'PC', annee: number, trimestre: number, matricule: string): string {
  const yy = String(annee).slice(-2);
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}${yy}T${trimestre}-${matricule}-${suffix}`.slice(0, 20);
}

export const cotisationsService = {
  async getCotisations(user: AuthenticatedUser, filters?: CotisationFilters): Promise<unknown[]> {
    const scopedFilters = { ...filters };
    if (user.role === 'ADHERENT') {
      if (!user.id_adherent) return [];
      scopedFilters.idAdherent = user.id_adherent;
    }
    return cotisationsRepository.findCotisations(scopedFilters);
  },

  async getCotisationsByAdherentId(user: AuthenticatedUser, idAdherent: string): Promise<unknown[]> {
    assertOwnAdherent(user, idAdherent);
    return cotisationsRepository.findCotisationsByAdherentId(idAdherent);
  },

  async getCotisationsByMatricule(user: AuthenticatedUser, matricule: string): Promise<unknown[]> {
    assertOwnMatricule(user, matricule);
    return cotisationsRepository.findCotisationsByMatricule(matricule);
  },

  async getAdherentsPourCotisation(): Promise<unknown[]> {
    return cotisationsRepository.findActiveAdherentsForCotisation();
  },

  async getInfoCotisationActive(user: AuthenticatedUser, idAdherent: string): Promise<unknown | null> {
    assertOwnAdherent(user, idAdherent);
    return cotisationsRepository.findActiveInfoCotisation(idAdherent);
  },

  async simulateCotisationSpontanee(payload: {
    id_adherent: number;
    montant: number;
    date: string;
  }): Promise<SimulationCotisationSpontaneeResult> {
    const adherent = normalizeActiveAdherent(
      await cotisationsRepository.findActiveAdherentById(payload.id_adherent),
    );
    const [info, compte, mortalite, regles] = await Promise.all([
      cotisationsRepository.findActiveInfoCotisation(String(payload.id_adherent)) as Promise<Record<string, unknown> | null>,
      cotisationsRepository.findCompteEsr(payload.id_adherent),
      parametresRepository.findMortalite() as Promise<Array<Record<string, unknown>>>,
      reglesActuariellesService.getRegles(payload.date),
    ]);
    if (!info) throw new AppError(409, 'Informations de cotisation actives introuvables.');
    if (!compte) throw new AppError(409, 'Compte ESR introuvable.');

    const capitalAcquisAvant = Number(compte.capital_acquis ?? 0);
    const capitalAcquisApres = capitalAcquisAvant + payload.montant;
    // Règle métier : le nombre de trimestres contractuel ne diminue jamais
    // dans une simulation de cotisation spontanée.
    const nombreTrimestres = Math.trunc(Number(info.nb_trimestre));
    const calcul = calculerCotisationTrimestrielleApresSpontanee({
      renteAnnuelle: Number(info.cotisation_annuelle),
      ageRetraite: Math.trunc(Number(info.age_retraite)),
      ageMaximum: Math.trunc(regles.ageMaximum),
      nombreTrimestresRestants: nombreTrimestres,
      tauxAnnuelPourcent: regles.tauxGaranti,
      fraisRentePourcent: regles.fraisRente,
      capitalAcquis: capitalAcquisApres,
      mortalite: mortalite.map((row) => ({ age: Number(row.age_mort), lx: Number(row.lx) })),
    });
    if (calcul.statut !== 'OK') {
      throw new AppError(409, 'Simulation actuarielle impossible pour cet adherent.');
    }

    const cotisationActuelle = Number(info.cotisation_es ?? 0);
    return {
      idAdherent: payload.id_adherent,
      matricule: adherent.matricule,
      montantSpontane: payload.montant,
      cotisationTrimestrielleActuelle: cotisationActuelle,
      nouvelleCotisationTrimestrielle: calcul.cotisationTrimestrielle,
      reductionTrimestrielle: Math.max(0, cotisationActuelle - calcul.cotisationTrimestrielle),
      capitalAcquisAvant,
      capitalAcquisApres,
      capitalConstitutif: calcul.capitalConstitutif,
      capitalRestant: calcul.capitalRestant,
      nombreTrimestres,
    };
  },

  async createCotisationSpontanee(payload: CotisationSpontaneePayload): Promise<unknown> {
    const adherent = normalizeActiveAdherent(
      await cotisationsRepository.findActiveAdherentById(payload.id_adherent),
    );
    // La date saisie demeure la date de valeur. Elle ne détermine plus la
    // période comptable d'un paiement spontané ordinaire.

    if (payload.id_precompte) {
      const precompte = await precomptesRepository.findById(payload.id_precompte);
      if (!precompte) throw new AppError(404, 'Precompte a regulariser introuvable.');
      if (String(precompte.matricule ?? '').trim().toUpperCase() !== adherent.matricule.trim().toUpperCase()) {
        throw new AppError(409, "Le precompte n'appartient pas a cet adherent.");
      }
      const periodePrecompte = String(precompte.periode).trim().toUpperCase();
      const parsedPrecompte = parsePeriodeTrimestre(periodePrecompte);
      if (!parsedPrecompte) throw new AppError(409, 'Periode du precompte invalide.');
      await periodesRepository.ensureOuverte(periodePrecompte);
      const referenceRegularisation = buildReference(
        'SP',
        parsedPrecompte.annee,
        parsedPrecompte.trimestre,
        adherent.matricule,
      ).replace(/^SP/, 'RG');
      try {
        const regularisation = await cotisationsRepository.regulariserPrecompte({
          idPrecompte: payload.id_precompte,
          idAdherent: payload.id_adherent,
          mode: payload.mode,
          periode: periodePrecompte,
          periodeDeb: parsedPrecompte.periodeDeb,
          periodeFin: parsedPrecompte.periodeFin,
          dateValeur: payload.date,
          montant: payload.montant,
          reference: referenceRegularisation,
        });
        const resultat = regularisation as Record<string, unknown>;
        return {
          ...resultat,
          entete: {
            id_cotisation_entete: Number(resultat.id_cotisation_entete ?? 0),
            reference: referenceRegularisation,
          },
          detail: {
            id_cotisation_detail: Number(resultat.id_cotisation_detail ?? 0),
            periode: periodePrecompte,
            date_valeur: payload.date,
            montant: payload.montant,
            source: 'REGULARISATION_PRECOMPTE',
            statut: 'ENCAISSEE',
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!/regulariser_precompte_esr|schema cache/i.test(message)) throw err;

        // Compatibilite jusqu'au deploiement de la migration SQL. Le lecteur
        // reconnait ces anciennes lignes par leur adherent, montant et date.
        const entete = await cotisationsRepository.createCotisationEntete({
          id_adherent: payload.id_adherent,
          mode: payload.mode,
          periode_deb: parsedPrecompte.periodeDeb,
          periode_fin: parsedPrecompte.periodeFin,
          reference: referenceRegularisation,
          statut: 'OUVERT',
        });
        try {
          const detail = await cotisationsRepository.createCotisationDetail({
            id_cotisation_entete: entete.id_cotisation_entete,
            periode: periodePrecompte,
            date_valeur: payload.date,
            montant: payload.montant,
            source: 'SPONTANEE',
            statut: 'ENCAISSEE',
          });
          const montantDepart = Number(precompte.montant_depart ?? 0);
          await precomptesRepository.markRegularise({
            idPrecompte: payload.id_precompte,
            montantRetour: payload.montant,
            dateRetour: payload.date,
            statutPrecompte: payload.montant >= montantDepart - 0.01 ? 'ENCAISSE' : 'PARTIEL',
          });
          return { entete, detail };
        } catch (fallbackError) {
          await cotisationsRepository.deleteCotisationEntete(entete.id_cotisation_entete).catch(() => undefined);
          throw fallbackError;
        }
      }
    }

    const periodeEnCours = await periodesRepository.findPeriodeEnCours();
    if (!periodeEnCours) {
      throw new AppError(409, 'Aucune periode ouverte pour enregistrer le paiement spontane.');
    }
    const periode = String(periodeEnCours.periode).trim().toUpperCase();
    const parsedPeriodeEnCours = parsePeriodeTrimestre(periode);
    if (!parsedPeriodeEnCours) {
      throw new AppError(500, 'La periode ouverte est invalide.');
    }
    const reference = buildReference(
      'SP',
      parsedPeriodeEnCours.annee,
      parsedPeriodeEnCours.trimestre,
      adherent.matricule,
    );

    const [info, compte, mortalite, regles] = await Promise.all([
      cotisationsRepository.findActiveInfoCotisation(String(payload.id_adherent)) as Promise<Record<string, unknown> | null>,
      cotisationsRepository.findCompteEsr(payload.id_adherent),
      parametresRepository.findMortalite() as Promise<Array<Record<string, unknown>>>,
      reglesActuariellesService.getRegles(payload.date),
    ]);
    if (!info) throw new AppError(409, 'Informations de cotisation actives introuvables.');
    if (!compte) throw new AppError(409, 'Compte ESR introuvable.');
    const nouveauCapital = Number(compte.capital_acquis ?? 0) + payload.montant;
    const calcul = calculerCotisationTrimestrielleApresSpontanee({
      renteAnnuelle: Number(info.cotisation_annuelle),
      ageRetraite: Math.trunc(Number(info.age_retraite)),
      ageMaximum: Math.trunc(regles.ageMaximum),
      nombreTrimestresRestants: Math.trunc(Number(info.nb_trimestre)),
      tauxAnnuelPourcent: regles.tauxGaranti,
      fraisRentePourcent: regles.fraisRente,
      capitalAcquis: nouveauCapital,
      mortalite: mortalite.map((row) => ({ age: Number(row.age_mort), lx: Number(row.lx) })),
    });
    if (calcul.statut !== 'OK') throw new AppError(409, 'Recalcul actuariel impossible apres le versement spontane.');
    return cotisationsRepository.enregistrerSpontaneeRecalculee({
      idAdherent: payload.id_adherent,
      mode: payload.mode,
      datePaiement: payload.date,
      dateValeur: dateValeurCotisationSpontanee(parsedPeriodeEnCours.annee, parsedPeriodeEnCours.trimestre),
      montant: payload.montant,
      periode,
      reference,
      nouvelleCotisation: calcul.cotisationTrimestrielle,
      tauxGaranti: regles.tauxGaranti,
      fraisRente: regles.fraisRente,
      idPaiementExistant: payload.id_paiement_existant,
    });
  },

  async generatePrecomptes(periode: string): Promise<GeneratePrecomptesResult> {
    const parsed = parsePeriodeTrimestre(periode);
    if (!parsed) {
      throw new AppError(400, 'Format de periode invalide. Attendu : 2026T2');
    }

    const normalizedPeriode = `${parsed.annee}T${parsed.trimestre}`;
    await periodesRepository.ensureOuverte(normalizedPeriode);

    const today = new Date().toISOString().split('T')[0];
    const adherents = await cotisationsRepository.findActiveAdherentsForCotisation();
    const eligible = adherents.filter((adherent: any) =>
      estEligibleAuPrecomptePourPeriode(adherent, parsed.periodeFin));

    if (eligible.length === 0) {
      return {
        created: 0,
        skipped: adherents.length,
        failed: 0,
        errors: ['Aucun adhérent n’est éligible à cette période selon sa date de premier précompte.'],
      };
    }

    const matriculesExistants = await precomptesRepository.findGeneratedMatricules(normalizedPeriode);
    let created = 0;
    let skipped = adherents.length - eligible.length;
    let failed = 0;
    const errors: string[] = [];

    for (const adherent of eligible as any[]) {
      if (!adherent.matricule || !adherent.id_adherent) {
        skipped++;
        continue;
      }
      if (matriculesExistants.has(String(adherent.matricule))) {
        skipped++;
        continue;
      }

      const reference = buildReference('PC', parsed.annee, parsed.trimestre, String(adherent.matricule));

      try {
        const entete = await cotisationsRepository.createCotisationEntete({
          id_adherent: Number(adherent.id_adherent),
          mode: 'PRECOMPTE',
          periode_deb: parsed.periodeDeb,
          periode_fin: parsed.periodeFin,
          reference,
          statut: 'OUVERT',
        });

        let detailId: number | null = null;
        try {
          const detail = (await cotisationsRepository.createCotisationDetail({
            id_cotisation_entete: entete.id_cotisation_entete,
            periode: normalizedPeriode,
            date_valeur: null,
            montant: Number(adherent.cotisation_es),
            source: 'PRECOMPTE',
            statut: 'PREVUE',
          })) as { id_cotisation_detail?: number };

          detailId = Number(detail.id_cotisation_detail);
          if (!detailId || Number.isNaN(detailId)) {
            throw new Error('id_cotisation_detail manquant');
          }

          const montantBrut = Number(adherent.cotisation_es);
          const precompte = await precomptesRepository.createPrecompte({
            matricule: String(adherent.matricule),
            periode: normalizedPeriode,
            montant_depart: montantBrut,
            montant_retour: 0,
            annee: parsed.annee,
            trimestre: parsed.trimestre,
            statut_precompte: 'GENERE',
            date_generation: today,
            id_cotisation_detail: detailId,
          });
          created++;
        } catch (err) {
          const precompte = await precomptesRepository
            .findByMatriculeAndPeriode(String(adherent.matricule), normalizedPeriode)
            .catch(() => null);
          if (precompte?.id_precompte) {
            await precomptesRepository.deletePrecompte(Number(precompte.id_precompte)).catch(() => undefined);
          }
          if (detailId) {
            await precomptesRepository.deleteCotisationDetail(detailId).catch(() => undefined);
          }
          await cotisationsRepository.deleteCotisationEntete(entete.id_cotisation_entete).catch(() => undefined);
          throw err;
        }
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${adherent.matricule} : ${msg}`);
      }
    }

    return { created, skipped, failed, errors };
  },
};
