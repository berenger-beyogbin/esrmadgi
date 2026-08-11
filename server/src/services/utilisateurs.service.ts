import type { User } from '@supabase/supabase-js';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser, UserProfile } from '../types';
import { auditService } from './audit.service';
import {
  UtilisateurFilters,
  UtilisateurRow,
  utilisateursRepository,
} from '../repositories/utilisateurs.repository';
import { normalizeRole, toStoredProfile } from '../utils/roles';
import { generateTemporaryPassword, isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

export interface UtilisateurDto {
  id: string;
  id_utilisateur: number;
  auth_user_id: string | null;
  matricule: string;
  email: string;
  telephone: string | null;
  user_actif: boolean;
  profil: UserProfile;
  role: UserProfile;
  id_adherent: string | null;
  date_creation: string | null;
  date_modif: string | null;
  email_confirme: boolean;
  derniere_connexion: string | null;
}

export interface CreateUtilisateurPayload {
  matricule: string;
  email: string;
  password: string;
  profil: UserProfile;
  telephone?: string | null;
  user_actif?: boolean;
  id_adherent?: number | null;
}

export interface EnsureAdherentAccessInput {
  matricule: string;
  idAdherent: number;
  telephone?: string | null;
}

export interface EnsureAdherentAccessResult {
  login: string;
  email: string;
  must_change_password: true;
}

export interface UpdateUtilisateurPayload {
  email?: string;
  password?: string;
  profil?: UserProfile;
  telephone?: string | null;
  user_actif?: boolean;
  id_adherent?: number | null;
}

function actor(user: AuthenticatedUser): string {
  return user.email || user.matricule || user.id_utilisateur;
}

function actorId(user: AuthenticatedUser): number | null {
  const value = Number(user.id_utilisateur);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeMatricule(matricule: string): string {
  return matricule.trim().toUpperCase();
}

function authUsersByKey(users: User[]): { byId: Map<string, User>; byEmail: Map<string, User> } {
  const byId = new Map<string, User>();
  const byEmail = new Map<string, User>();

  for (const user of users) {
    byId.set(user.id, user);
    if (user.email) byEmail.set(user.email.toLowerCase(), user);
  }

  return { byId, byEmail };
}

function toDto(row: UtilisateurRow, authUser?: User): UtilisateurDto {
  const role = normalizeRole(row.profil) ?? 'ADHERENT';

  return {
    id: String(row.id_utilisateur),
    id_utilisateur: row.id_utilisateur,
    auth_user_id: row.auth_user_id,
    matricule: String(row.matricule ?? ''),
    email: String(row.email ?? authUser?.email ?? ''),
    telephone: row.telephone ?? null,
    user_actif: row.user_actif === true,
    profil: role,
    role,
    id_adherent: row.id_adherent == null ? null : String(row.id_adherent),
    date_creation: row.date_creation ?? row.created_at ?? null,
    date_modif: row.date_modif ?? row.updated_at ?? null,
    email_confirme: Boolean(authUser?.confirmed_at),
    derniere_connexion: authUser?.last_sign_in_at ?? null,
  };
}

async function resolveLinkedAdherentId(payload: {
  profil: UserProfile;
  matricule: string;
  id_adherent?: number | null;
}): Promise<number | null> {
  if (payload.profil !== 'ADHERENT') return null;
  if (payload.id_adherent) return payload.id_adherent;

  const adherent = await utilisateursRepository.findAdherentByMatricule(payload.matricule);
  if (!adherent) {
    throw new AppError(400, 'Aucun adherent MADGI ne correspond a ce matricule.');
  }
  return adherent.id_adherent;
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const users = await utilisateursRepository.listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export const utilisateursService = {
  // Cree (ou repare) l'acces premiere connexion d'un adherent : compte utilisateurs
  // profil ADHERENT + compte Supabase Auth avec mot de passe temporaire aleatoire que
  // personne ne voit jamais, must_change_password force l'adherent a le definir lui-meme
  // via le flux SMS de premiere connexion. Utilise a la validation d'une adhesion en ligne
  // et a l'activation d'un adherent sans acces existant.
  async ensureAdherentAccess(
    user: AuthenticatedUser,
    input: EnsureAdherentAccessInput,
  ): Promise<EnsureAdherentAccessResult> {
    const matricule = normalizeMatricule(input.matricule);
    const email = `${matricule.toLowerCase()}@madgi.ci`;
    const temporaryPassword = generateTemporaryPassword(matricule);
    const auditUserId = actorId(user);
    const existingRow = await utilisateursRepository.findByMatricule(matricule);

    let authUser = existingRow?.auth_user_id
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
      authUser = authUser
        ? await utilisateursRepository.updateAuthUser(authUser.id, {
            email,
            password: temporaryPassword,
            matricule,
            profil: 'ADHERENT',
            must_change_password: true,
          })
        : await utilisateursRepository.createAuthUser({
            email,
            password: temporaryPassword,
            matricule,
            profil: 'ADHERENT',
            must_change_password: true,
          });
    }

    if (existingRow) {
      await utilisateursRepository.update(existingRow.id_utilisateur, {
        auth_user_id: authUser.id,
        email,
        telephone: input.telephone ?? null,
        user_actif: true,
        profil: 'ADHERENT',
        id_adherent: input.idAdherent,
        auditUserId,
      });
    } else {
      await utilisateursRepository.create({
        auth_user_id: authUser.id,
        matricule,
        email,
        telephone: input.telephone ?? null,
        user_actif: true,
        profil: 'ADHERENT',
        id_adherent: input.idAdherent,
        auditUserId,
      });
    }

    await auditService
      .logEvent(user, {
        action: existingRow ? 'REPARATION_ACCES_PREMIERE_CONNEXION' : 'CREATION_ACCES_PREMIERE_CONNEXION',
        objetAudit: 'utilisateurs',
        idObjet: input.idAdherent,
        details: `Acces premiere connexion cree pour l'adherent ${matricule}.`,
      })
      .catch(() => undefined);

    return { login: matricule, email, must_change_password: true };
  },

  async getAll(filters?: UtilisateurFilters): Promise<UtilisateurDto[]> {
    const roleFilter =
      filters?.profil && filters.profil !== 'TOUS' ? normalizeRole(filters.profil) : null;
    const rows = await utilisateursRepository.findAll({
      ...filters,
      profil: roleFilter ? toStoredProfile(roleFilter) : undefined,
    });
    const users = await utilisateursRepository.listAuthUsers();
    const maps = authUsersByKey(users);

    return rows.map((row) => {
      const authUser =
        (row.auth_user_id ? maps.byId.get(row.auth_user_id) : undefined) ||
        (row.email ? maps.byEmail.get(row.email.toLowerCase()) : undefined);
      return toDto(row, authUser);
    });
  },

  async create(user: AuthenticatedUser, payload: CreateUtilisateurPayload): Promise<UtilisateurDto> {
    if (!isStrongPassword(payload.password)) {
      throw new AppError(400, PASSWORD_POLICY_MESSAGE);
    }

    const matricule = normalizeMatricule(payload.matricule);
    const email = normalizeEmail(payload.email);
    const profil = toStoredProfile(payload.profil);
    const auditUserId = actorId(user);
    const idAdherent = await resolveLinkedAdherentId({ profil, matricule, id_adherent: payload.id_adherent });

    const existingRow = await utilisateursRepository.findByMatricule(matricule);
    let authUser =
      (existingRow?.auth_user_id
        ? await utilisateursRepository
            .updateAuthUser(existingRow.auth_user_id, {
              email,
              password: payload.password,
              matricule,
              profil,
              must_change_password: true,
            })
            .catch(() => null)
        : null) || (await findAuthUserByEmail(email));

    if (authUser) {
      authUser = await utilisateursRepository.updateAuthUser(authUser.id, {
        email,
        password: payload.password,
        matricule,
        profil,
        must_change_password: true,
      });
    } else {
      authUser = await utilisateursRepository.createAuthUser({
        email,
        password: payload.password,
        matricule,
        profil,
        must_change_password: true,
      });
    }

    const row = existingRow
      ? await utilisateursRepository.update(existingRow.id_utilisateur, {
          auth_user_id: authUser.id,
          email,
          telephone: payload.telephone ?? null,
          user_actif: payload.user_actif ?? true,
          profil,
          id_adherent: idAdherent,
          auditUserId,
        })
      : await utilisateursRepository.create({
          auth_user_id: authUser.id,
          matricule,
          email,
          telephone: payload.telephone ?? null,
          user_actif: payload.user_actif ?? true,
          profil,
          id_adherent: idAdherent,
          auditUserId,
        });

    await auditService
      .logEvent(user, {
        action: existingRow ? 'REPARATION_ACCES_UTILISATEUR' : 'CREATION_UTILISATEUR',
        objetAudit: 'utilisateurs',
        details: `Acces utilisateur ${matricule} configure avec le profil ${profil}.`,
      })
      .catch(() => undefined);

    return toDto(row, authUser);
  },

  async update(user: AuthenticatedUser, id: number, payload: UpdateUtilisateurPayload): Promise<UtilisateurDto> {
    if (payload.password && !isStrongPassword(payload.password)) {
      throw new AppError(400, PASSWORD_POLICY_MESSAGE);
    }

    const existing = await utilisateursRepository.findById(id);
    if (!existing) {
      throw new AppError(404, 'Utilisateur introuvable');
    }

    const profil = payload.profil ? toStoredProfile(payload.profil) : normalizeRole(existing.profil) ?? 'ADHERENT';
    const matricule = normalizeMatricule(String(existing.matricule ?? ''));
    const email = payload.email ? normalizeEmail(payload.email) : String(existing.email ?? '');
    const auditUserId = actorId(user);

    if (String(user.id_utilisateur) === String(id)) {
      if (payload.user_actif === false || (payload.profil && profil !== toStoredProfile(user.role))) {
        throw new AppError(400, 'Impossible de retirer vos propres acces administrateur depuis cette session.');
      }
    }

    const idAdherent =
      payload.id_adherent !== undefined
        ? await resolveLinkedAdherentId({ profil, matricule, id_adherent: payload.id_adherent })
        : existing.id_adherent;

    let authUser: User | null = null;
    if (existing.auth_user_id) {
      authUser = await utilisateursRepository.updateAuthUser(existing.auth_user_id, {
        email,
        password: payload.password || undefined,
        matricule,
        profil,
        must_change_password: payload.password ? true : undefined,
      });
    } else if (payload.password) {
      authUser =
        (await findAuthUserByEmail(email)) ||
        (await utilisateursRepository.createAuthUser({
          email,
          password: payload.password,
          matricule,
          profil,
          must_change_password: true,
        }));
      if (authUser.email?.toLowerCase() === email) {
        authUser = await utilisateursRepository.updateAuthUser(authUser.id, {
          email,
          password: payload.password,
          matricule,
          profil,
          must_change_password: true,
        });
      }
    }

    const row = await utilisateursRepository.update(id, {
      auth_user_id: authUser?.id ?? existing.auth_user_id,
      email,
      telephone: payload.telephone !== undefined ? payload.telephone : existing.telephone,
      user_actif: payload.user_actif !== undefined ? payload.user_actif : existing.user_actif === true,
      profil,
      id_adherent: idAdherent ?? null,
      auditUserId,
    });

    await auditService
      .logEvent(user, {
        action: 'MODIFICATION_UTILISATEUR',
        objetAudit: 'utilisateurs',
        details: `Acces utilisateur ${matricule} mis a jour avec le profil ${profil}.`,
      })
      .catch(() => undefined);

    return toDto(row, authUser ?? undefined);
  },
};
