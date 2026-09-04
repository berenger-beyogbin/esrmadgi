import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { adherentsRepository } from '../repositories/adherents.repository';
import { agentsService } from './agents.service';
import { auditService } from './audit.service';
import { parametresRepository } from '../repositories/parametres.repository';
import { utilisateursService } from './utilisateurs.service';
import {
  OnlineAdhesionFilters,
  OnlineAdhesionPayload,
  OnlineAdhesionStatus,
  adhesionsEnLigneRepository,
} from '../repositories/adhesions-en-ligne.repository';
import { appliquerRegleRetraite } from './regle-retraite.service';

type AnyRow = Record<string, any>;

function actor(user: AuthenticatedUser): string {
  return user.email || user.matricule || user.id_utilisateur;
}

function calculateDateEffetFromPrecompte(datePrecompte: string | null | undefined): string | null {
  const isoDatePrecompte = toStrictIsoDate(datePrecompte);
  if (!isoDatePrecompte) return null;

  const date = new Date(`${isoDatePrecompte}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function ensureFirstLoginAccess(user: AuthenticatedUser, adhesion: AnyRow) {
  const matricule = String(adhesion.matricule ?? '').trim().toUpperCase();
  const idAdherent = Number(adhesion.id_adherent ?? adhesion.id);
  if (!matricule || !Number.isInteger(idAdherent)) {
    throw new AppError(500, 'Impossible de creer l acces utilisateur : adherent incomplet.');
  }

  return utilisateursService.ensureAdherentAccess(user, {
    matricule,
    idAdherent,
    telephone: adhesion.telephone ? String(adhesion.telephone) : null,
  });
}

function normalizePayload(payload: OnlineAdhesionPayload): OnlineAdhesionPayload {
  const normalizedDatePrecompte = toStrictIsoDate(payload.date_precompte) ?? payload.date_precompte ?? null;
  const normalizedDateEffet = calculateDateEffetFromPrecompte(normalizedDatePrecompte) ?? payload.date_effet;

  return {
    ...payload,
    matricule: payload.matricule.trim().toUpperCase(),
    nom: payload.nom.trim().toUpperCase(),
    prenoms: payload.prenoms.trim(),
    lieu_naissance: payload.lieu_naissance.trim(),
    email: payload.email?.trim() || null,
    adresse_geographique: payload.adresse_geographique.trim(),
    adresse_postale: payload.adresse_postale.trim(),
    direction: payload.direction.trim(),
    sexe: payload.sexe || sexeFromCivilite(payload.civilite),
    grade: payload.grade?.trim() || '',
    date_precompte: normalizedDatePrecompte,
    date_effet: normalizedDateEffet,
    taux_gar: payload.taux_gar ?? null,
    frais_rente: payload.frais_rente ?? null,
    taux_rachat: payload.taux_rachat ?? null,
  };
}

function sexeFromCivilite(civilite: string): string | null {
  const normalized = civilite
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (normalized.includes('MONSIEUR')) return 'M';
  if (normalized.includes('MADAME') || normalized.includes('MADEMOISELLE')) return 'F';
  return null;
}

function toStrictIsoDate(value: string | null | undefined): string | null {
  const match = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getAllowedPremierPrecompteDates(dateSouscription: string): string[] {
  const isoDateSouscription = toStrictIsoDate(dateSouscription);
  if (!isoDateSouscription) return [];

  const adhesionYear = Number(isoDateSouscription.slice(0, 4));
  if (!Number.isInteger(adhesionYear)) return [];
  const adhesionMonth = Number(isoDateSouscription.slice(5, 7));
  if (!Number.isInteger(adhesionMonth) || adhesionMonth < 1 || adhesionMonth > 12) return [];
  const currentQuarter = Math.floor((adhesionMonth - 1) / 3) + 1;
  const currentQuarterStart = `${adhesionYear}-${String((currentQuarter - 1) * 3 + 1).padStart(2, '0')}-01`;

  return [adhesionYear, adhesionYear + 1]
    .flatMap((year) => [
      `${year}-03-31`,
      `${year}-06-30`,
      `${year}-09-30`,
      `${year}-12-31`,
    ])
    .filter((datePrecompte) => datePrecompte >= currentQuarterStart);
}

function ensureSubmittable(payload: OnlineAdhesionPayload): void {
  if (!payload.grade_id) {
    throw new AppError(400, 'Le grade professionnel est obligatoire.');
  }
  if (!payload.date_precompte || !payload.date_effet || !payload.date_retraite) {
    throw new AppError(400, 'Les dates ESR calculees sont incompletes.');
  }
  const allowedPrecompteDates = getAllowedPremierPrecompteDates(payload.date_souscription);
  const datePrecompte = toStrictIsoDate(payload.date_precompte);
  if (!datePrecompte || !allowedPrecompteDates.includes(datePrecompte)) {
    throw new AppError(
      400,
      allowedPrecompteDates.length === 0
        ? "Aucun trimestre de premier precompte n'est disponible pour cette date d'adhesion."
      : "Le premier precompte doit etre le dernier jour d'un trimestre autorise de l'annee d'adhesion ou de l'annee suivante.",
    );
  }
  const dateEffet = toStrictIsoDate(payload.date_effet);
  const expectedDateEffet = calculateDateEffetFromPrecompte(datePrecompte);
  if (!dateEffet || dateEffet !== expectedDateEffet) {
    throw new AppError(400, 'La date d effet du contrat doit etre le lendemain de la date du premier precompte.');
  }
  if (Number(payload.nb_trimestre) <= 0) {
    throw new AppError(400, 'Le nombre de trimestres est invalide.');
  }
  if (Number(payload.cotisation_annuelle) <= 0 || Number(payload.cotisation_es) <= 0) {
    throw new AppError(400, 'La cotisation ESR est invalide.');
  }
}

function findParamValue(params: AnyRow[], code: string): string | null {
  return params.find((param) => param.code === code)?.valeur ?? null;
}

function parsePercent(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(String(value).replace('%', '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;

  const fr = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}${fr[2]}${fr[1]}`;

  const compact = raw.replace(/\D/g, '');
  return compact.length === 8 ? compact : null;
}

async function enrichWithCurrentActuarialParams(payload: OnlineAdhesionPayload): Promise<OnlineAdhesionPayload> {
  const params = (await parametresRepository.findParametresGeneraux()) as AnyRow[];
  const tauxGar = parsePercent(findParamValue(params, 'TAUX_GAR'));
  const fraisRente = parsePercent(findParamValue(params, 'FRAIS_RENTE'));
  const tauxRachat = parsePercent(findParamValue(params, 'TAUX_RACHAT'));

  return {
    ...payload,
    taux_gar: payload.taux_gar ?? tauxGar,
    frais_rente: payload.frais_rente ?? fraisRente,
    taux_rachat: payload.taux_rachat ?? tauxRachat,
  };
}

async function normalizeAndRecalculatePayload(payload: OnlineAdhesionPayload): Promise<OnlineAdhesionPayload> {
  return appliquerRegleRetraite(
    await enrichWithCurrentActuarialParams(normalizePayload(payload)),
  );
}

const PUBLIC_REFERENTIELS_CACHE_TTL_MS = 5 * 60 * 1000;
let publicReferentielsCache: { data: unknown; expiresAt: number } | null = null;
let publicReferentielsRequest: Promise<unknown> | null = null;

export const adhesionsEnLigneService = {
  async commercialActivity() {
    const { commerciaux, dossiers } = await adhesionsEnLigneRepository.commercialActivity();
    const rows = commerciaux.map((commercial: AnyRow) => {
      const own = dossiers.filter((item: AnyRow) => String(item.commercial_id) === String(commercial.id_utilisateur));
      const valides = own.filter((item: AnyRow) => item.statut === true || String(item.etat).toUpperCase() === 'ACTIF').length;
      const rejetes = own.filter((item: AnyRow) => String(item.etat).toUpperCase() === 'REJETE').length;
      const enAttente = own.length - valides - rejetes;
      return {
        id_utilisateur: commercial.id_utilisateur,
        matricule: commercial.matricule,
        email: commercial.email,
        actif: commercial.user_actif === true,
        total: own.length,
        en_attente: enAttente,
        valides,
        rejetes,
        taux_conversion: own.length ? Math.round((valides / own.length) * 100) : 0,
        derniere_activite: own[0]?.created_at ?? null,
        dossiers: own.map((item: AnyRow) => ({
          id: String(item.id_adherent),
          matricule: item.matricule,
          nom: item.nom,
          prenoms: item.prenoms,
          statut_demande: item.statut === true || String(item.etat).toUpperCase() === 'ACTIF'
            ? 'VALIDE'
            : String(item.etat).toUpperCase() === 'REJETE' ? 'REJETE' : 'EN_ATTENTE',
          created_at: item.created_at ?? null,
        })),
      };
    });
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const valides = rows.reduce((sum, row) => sum + row.valides, 0);
    const rejetes = rows.reduce((sum, row) => sum + row.rejetes, 0);
    return {
      synthese: {
        commerciaux: rows.length,
        commerciaux_actifs: rows.filter((row) => row.actif).length,
        dossiers: total,
        en_attente: rows.reduce((sum, row) => sum + row.en_attente, 0),
        valides,
        rejetes,
        taux_conversion: total ? Math.round((valides / total) * 100) : 0,
      },
      commerciaux: rows.sort((a, b) => b.total - a.total),
    };
  },

  async searchAgent(matricule: string, dateNaissance: string) {
    const normalizedMatricule = matricule.trim().toUpperCase();
    const result = await agentsService.searchByMatricule(normalizedMatricule);
    if (!result.found || !result.data) {
      return {
        ...result,
        found: false,
        data: null,
        error: result.error || 'Matricule incorrect ou introuvable.',
      };
    }

    const expectedDate = dateKey(result.data.date_naissance);
    const submittedDate = dateKey(dateNaissance);
    if (!expectedDate) {
      return {
        found: false,
        data: null,
        error: 'La date de naissance est absente du référentiel pour ce matricule. Veuillez contacter la MADGI ESR.',
      };
    }
    if (!submittedDate || expectedDate !== submittedDate) {
      return {
        found: false,
        data: null,
        error: 'La date de naissance ne correspond pas à ce matricule.',
      };
    }

    // Le contrôle est effectué après validation du couple matricule/date de
    // naissance afin de ne pas révéler publiquement l'existence d'un adhérent.
    const existing = (await adhesionsEnLigneRepository.findByMatricule(normalizedMatricule)) as AnyRow | null;
    if (existing) {
      if (existing.adhesion_en_ligne === true && existing.statut_demande === 'EN_ATTENTE') {
        return {
          found: false,
          data: null,
          error: 'Une demande d’adhésion en ligne existe déjà pour ce matricule et est en attente de validation.',
        };
      }

      if (existing.adhesion_en_ligne !== true || existing.statut_demande === 'VALIDE') {
        return {
          found: false,
          data: null,
          error: 'Ce matricule est déjà adhérent à la MADGI ESR.',
        };
      }
    }

    const safeAgent = { ...result.data };
    delete safeAgent.raw;
    return { ...result, data: safeAgent };
  },

  async getPublicReferentiels(): Promise<unknown> {
    if (publicReferentielsCache && publicReferentielsCache.expiresAt > Date.now()) {
      return publicReferentielsCache.data;
    }
    if (publicReferentielsRequest) return publicReferentielsRequest;

    publicReferentielsRequest = (async () => {
      const [civilites, situations, emplois, grades, mortalite, params] = await Promise.all([
        adherentsRepository.findActiveCivilites(),
        adherentsRepository.findActiveSituationsMatrimoniales(),
        adherentsRepository.findActiveEmplois(),
        adherentsRepository.findActiveGrades(),
        parametresRepository.findMortalite(),
        parametresRepository.findParametresGeneraux(),
      ]);

      const paramRows = params as AnyRow[];
      const tauxGar = parsePercent(findParamValue(paramRows, 'TAUX_GAR'));
      const fraisRente = parsePercent(findParamValue(paramRows, 'FRAIS_RENTE'));
      const ageMaxRaw = findParamValue(paramRows, 'AGE_MAX');
      const ageMax = ageMaxRaw ? Number(ageMaxRaw) : null;
      const promoRow = paramRows.find((row) => row.code === 'PROMO_ABATTEMENT_RETRAITE');
      const data = {
        civilites,
        situations_matrimoniales: situations,
        emplois,
        grades,
        mortalite,
        parametres_calcul: {
          tauxAnnuel: tauxGar == null ? null : tauxGar / 100,
          fraisRente: fraisRente == null ? null : fraisRente / 100,
          ageMax: Number.isFinite(ageMax) ? ageMax : null,
        },
        promo_abattement_retraite: promoRow
          ? {
              actif: Boolean(promoRow.actif),
              dateDebut: promoRow.date_debut == null ? null : String(promoRow.date_debut),
              dateFin: promoRow.date_fin == null ? null : String(promoRow.date_fin),
            }
          : null,
      };
      publicReferentielsCache = { data, expiresAt: Date.now() + PUBLIC_REFERENTIELS_CACHE_TTL_MS };
      return data;
    })();

    try {
      return await publicReferentielsRequest;
    } finally {
      publicReferentielsRequest = null;
    }
  },

  async submitPublic(payload: OnlineAdhesionPayload): Promise<unknown> {
    const normalized = await normalizeAndRecalculatePayload(payload);
    ensureSubmittable(normalized);

    const existing = (await adhesionsEnLigneRepository.findByMatricule(normalized.matricule)) as AnyRow | null;
    if (existing && existing.adhesion_en_ligne !== true) {
      throw new AppError(409, 'Ce matricule existe deja dans le registre des adherents.');
    }
    if (existing?.statut_demande === 'VALIDE') {
      throw new AppError(409, 'Ce matricule dispose deja d une adhesion validee.');
    }
    if (existing?.id_adherent) {
      return adhesionsEnLigneRepository.update(String(existing.id_adherent), normalized, 'EN_ATTENTE');
    }

    return adhesionsEnLigneRepository.createPending(normalized);
  },

  async submitCommercial(user: AuthenticatedUser, payload: OnlineAdhesionPayload): Promise<unknown> {
    const normalized = await normalizeAndRecalculatePayload(payload);
    ensureSubmittable(normalized);
    const existing = (await adhesionsEnLigneRepository.findByMatricule(normalized.matricule)) as AnyRow | null;
    if (existing && existing.adhesion_en_ligne !== true) {
      throw new AppError(409, 'Ce matricule existe deja dans le registre des adherents.');
    }
    if (existing?.statut_demande === 'VALIDE') {
      throw new AppError(409, 'Ce matricule dispose deja d une adhesion validee.');
    }
    if (existing?.id_adherent) {
      if (String(existing.commercial_id ?? '') !== String(user.id_utilisateur)) {
        throw new AppError(409, 'Une demande est deja en cours pour ce matricule.');
      }
      return adhesionsEnLigneRepository.update(String(existing.id_adherent), normalized, 'EN_ATTENTE');
    }
    const data = await adhesionsEnLigneRepository.createPending(normalized, {
      commercialId: user.id_utilisateur,
      source: 'COMMERCIAL',
    });
    await auditService.logEvent(user, {
      action: 'CREATION_ADHESION_COMMERCIALE',
      objetAudit: 'ADHESION_EN_LIGNE',
      idObjet: String((data as AnyRow).id_adherent ?? (data as AnyRow).id ?? ''),
      details: `Demande ${normalized.matricule} saisie par le commercial ${actor(user)}.`,
    }).catch(() => undefined);
    return data;
  },

  async listMine(user: AuthenticatedUser, filters?: OnlineAdhesionFilters): Promise<unknown[]> {
    return adhesionsEnLigneRepository.list({ ...filters, commercialId: user.id_utilisateur, statut: filters?.statut ?? 'TOUS' });
  },

  async list(filters?: OnlineAdhesionFilters): Promise<unknown[]> {
    return adhesionsEnLigneRepository.list(filters);
  },

  async getById(id: string): Promise<unknown> {
    const data = await adhesionsEnLigneRepository.findById(id);
    if (!data) throw new AppError(404, 'Demande d adhesion en ligne introuvable');
    return data;
  },

  async update(user: AuthenticatedUser, id: string, payload: OnlineAdhesionPayload): Promise<unknown> {
    await this.getById(id);
    const normalized = await normalizeAndRecalculatePayload(payload);
    ensureSubmittable(normalized);
    const data = await adhesionsEnLigneRepository.update(id, normalized, 'EN_ATTENTE');

    await auditService
      .logEvent(user, {
        action: 'MODIFICATION_ADHESION_EN_LIGNE',
        objetAudit: 'ADHESION_EN_LIGNE',
        idObjet: id,
        details: `Modification de la demande en ligne ${normalized.matricule} par ${actor(user)}.`,
      })
      .catch(() => undefined);

    return data;
  },

  async validate(user: AuthenticatedUser, id: string, payload: OnlineAdhesionPayload): Promise<unknown> {
    const existing = (await this.getById(id)) as AnyRow;
    if (existing.statut_demande === 'VALIDE') {
      throw new AppError(400, 'Cette adhesion est deja validee.');
    }

    const normalized = await normalizeAndRecalculatePayload(payload);
    ensureSubmittable(normalized);
    const data = await adhesionsEnLigneRepository.update(id, normalized, 'VALIDE');
    const firstLogin = await ensureFirstLoginAccess(user, data as AnyRow);

    await auditService
      .logEvent(user, {
        action: 'VALIDATION_ADHESION_EN_LIGNE',
        objetAudit: 'ADHESION_EN_LIGNE',
        idObjet: id,
        details: `Validation de l'adhesion en ligne ${normalized.matricule} par ${actor(user)}.`,
      })
      .catch(() => undefined);

    return {
      ...(data as AnyRow),
      first_login: firstLogin,
    };
  },

  async reject(user: AuthenticatedUser, id: string, motif?: string): Promise<unknown> {
    const existing = (await this.getById(id)) as AnyRow;
    if (existing.statut_demande === 'VALIDE') {
      throw new AppError(400, 'Une adhesion deja validee ne peut pas etre rejetee.');
    }

    const data = await adhesionsEnLigneRepository.reject(id);

    await auditService
      .logEvent(user, {
        action: 'REJET_ADHESION_EN_LIGNE',
        objetAudit: 'ADHESION_EN_LIGNE',
        idObjet: id,
        details: `Rejet de l'adhesion en ligne ${existing.matricule}. Motif : ${motif || 'non renseigne'}.`,
      })
      .catch(() => undefined);

    return data;
  },
};
