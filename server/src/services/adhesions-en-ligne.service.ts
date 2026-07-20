import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import { adherentsRepository } from '../repositories/adherents.repository';
import { agentsService } from './agents.service';
import { auditService } from './audit.service';
import { parametresRepository } from '../repositories/parametres.repository';
import { utilisateursRepository } from '../repositories/utilisateurs.repository';
import { generateTemporaryPassword } from '../utils/passwordPolicy';
import {
  OnlineAdhesionFilters,
  OnlineAdhesionPayload,
  OnlineAdhesionStatus,
  adhesionsEnLigneRepository,
} from '../repositories/adhesions-en-ligne.repository';

type AnyRow = Record<string, any>;

function actor(user: AuthenticatedUser): string {
  return user.email || user.matricule || user.id_utilisateur;
}

function actorId(user: AuthenticatedUser): number | null {
  const value = Number(user.id_utilisateur);
  return Number.isInteger(value) ? value : null;
}

function loginEmailFromMatricule(matricule: string): string {
  return `${matricule.trim().toLowerCase()}@madgi.ci`;
}

function temporaryPasswordFor(matricule: string): string {
  return generateTemporaryPassword(matricule.trim().toUpperCase());
}

function calculateDateEffetFromPrecompte(datePrecompte: string | null | undefined): string | null {
  const isoDatePrecompte = toStrictIsoDate(datePrecompte);
  if (!isoDatePrecompte) return null;

  const year = Number(isoDatePrecompte.slice(0, 4));
  const month = Number(isoDatePrecompte.slice(5, 7));
  const currentQuarter = Math.floor((month - 1) / 3) + 1;
  const nextQuarterYear = currentQuarter === 4 ? year + 1 : year;
  const nextQuarterMonth = currentQuarter === 4 ? 1 : currentQuarter * 3 + 1;
  return `${nextQuarterYear}-${String(nextQuarterMonth).padStart(2, '0')}-01`;
}

async function findAuthUserByEmail(email: string) {
  const users = await utilisateursRepository.listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureFirstLoginAccess(user: AuthenticatedUser, adhesion: AnyRow) {
  const matricule = String(adhesion.matricule ?? '').trim().toUpperCase();
  const idAdherent = Number(adhesion.id_adherent ?? adhesion.id);
  if (!matricule || !Number.isInteger(idAdherent)) {
    throw new AppError(500, 'Impossible de creer l acces utilisateur : adherent incomplet.');
  }

  const email = loginEmailFromMatricule(matricule);
  const telephone = adhesion.telephone ? String(adhesion.telephone) : null;
  const temporaryPassword = temporaryPasswordFor(matricule);
  const auditUserId = actorId(user);
  const existingRow = await utilisateursRepository.findByMatricule(matricule);

  let authUser =
    existingRow?.auth_user_id
      ? await utilisateursRepository
          .updateAuthUser(existingRow.auth_user_id, {
            email,
            password: temporaryPassword,
            matricule,
            profil: 'ADHERENT',
            must_change_password: true,
          })
          .catch(() => null)
      : null;

  if (!authUser) {
    authUser = await findAuthUserByEmail(email);
    if (authUser) {
      authUser = await utilisateursRepository.updateAuthUser(authUser.id, {
        email,
        password: temporaryPassword,
        matricule,
        profil: 'ADHERENT',
        must_change_password: true,
      });
    } else {
      authUser = await utilisateursRepository.createAuthUser({
        email,
        password: temporaryPassword,
        matricule,
        profil: 'ADHERENT',
        must_change_password: true,
      });
    }
  }

  if (existingRow) {
    await utilisateursRepository.update(existingRow.id_utilisateur, {
      auth_user_id: authUser.id,
      email,
      telephone,
      user_actif: true,
      profil: 'ADHERENT',
      id_adherent: idAdherent,
      auditUserId,
    });
  } else {
    await utilisateursRepository.create({
      auth_user_id: authUser.id,
      matricule,
      email,
      telephone,
      user_actif: true,
      profil: 'ADHERENT',
      id_adherent: idAdherent,
      auditUserId,
    });
  }

  await auditService
    .logEvent(user, {
      action: existingRow ? 'REPARATION_ACCES_PREMIERE_CONNEXION' : 'CREATION_ACCES_PREMIERE_CONNEXION',
      objetAudit: 'utilisateurs',
      idObjet: idAdherent,
      details: `Acces premiere connexion cree pour l'adherent ${matricule}.`,
    })
    .catch(() => undefined);

  return {
    login: matricule,
    email,
    must_change_password: true,
  };
}

function normalizePayload(payload: OnlineAdhesionPayload): OnlineAdhesionPayload {
  const normalizedDatePrecompte = toStrictIsoDate(payload.date_precompte) ?? payload.date_precompte ?? null;
  const normalizedDateEffet = calculateDateEffetFromPrecompte(normalizedDatePrecompte) ?? payload.date_effet;

  return {
    ...payload,
    matricule: payload.matricule.trim().toUpperCase(),
    nom: payload.nom.trim().toUpperCase(),
    prenoms: payload.prenoms.trim(),
    email: payload.email?.trim() || null,
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

  return [adhesionYear, adhesionYear + 1]
    .flatMap((year) => [
      `${year}-01-01`,
      `${year}-04-01`,
      `${year}-07-01`,
      `${year}-10-01`,
    ])
    .filter((datePrecompte) => datePrecompte >= isoDateSouscription);
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
      : "Le premier precompte doit etre le premier jour d'un trimestre autorise de l'annee d'adhesion ou de l'annee suivante.",
    );
  }
  const dateEffet = toStrictIsoDate(payload.date_effet);
  const expectedDateEffet = calculateDateEffetFromPrecompte(datePrecompte);
  if (!dateEffet || dateEffet !== expectedDateEffet) {
    throw new AppError(400, 'La date d effet du contrat est incoherente avec le trimestre de premier precompte.');
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

const PUBLIC_REFERENTIELS_CACHE_TTL_MS = 5 * 60 * 1000;
let publicReferentielsCache: { data: unknown; expiresAt: number } | null = null;
let publicReferentielsRequest: Promise<unknown> | null = null;

export const adhesionsEnLigneService = {
  async searchAgent(matricule: string, dateNaissance: string) {
    const result = await agentsService.searchByMatricule(matricule.trim().toUpperCase());
    if (!result.found || !result.data) return result;

    const expectedDate = dateKey(result.data.date_naissance);
    const submittedDate = dateKey(dateNaissance);
    if (!expectedDate || !submittedDate || expectedDate !== submittedDate) {
      return {
        found: false,
        data: null,
        error: 'Matricule ou date de naissance incorrect.',
      };
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
    const normalized = await enrichWithCurrentActuarialParams(normalizePayload(payload));
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
    const normalized = await enrichWithCurrentActuarialParams(normalizePayload(payload));
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

    const normalized = await enrichWithCurrentActuarialParams(normalizePayload(payload));
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
