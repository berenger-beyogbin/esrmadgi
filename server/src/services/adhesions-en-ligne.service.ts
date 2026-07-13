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
    temporary_password: temporaryPassword,
    must_change_password: true,
  };
}

function normalizePayload(payload: OnlineAdhesionPayload): OnlineAdhesionPayload {
  return {
    ...payload,
    matricule: payload.matricule.trim().toUpperCase(),
    nom: payload.nom.trim().toUpperCase(),
    prenoms: payload.prenoms.trim(),
    email: payload.email?.trim() || null,
    sexe: payload.sexe || sexeFromCivilite(payload.civilite),
    grade: payload.grade?.trim() || '',
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

function ensureSubmittable(payload: OnlineAdhesionPayload): void {
  if (!payload.grade_id) {
    throw new AppError(400, 'Le grade professionnel est obligatoire.');
  }
  if (!payload.date_precompte || !payload.date_effet || !payload.date_retraite) {
    throw new AppError(400, 'Les dates ESR calculees sont incompletes.');
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

export const adhesionsEnLigneService = {
  async searchAgent(matricule: string) {
    return agentsService.searchByMatricule(matricule.trim().toUpperCase());
  },

  async getPublicReferentiels(): Promise<unknown> {
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

    return {
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
