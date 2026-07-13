import { AppError } from '../middleware/errorHandler';
import { AuthenticatedUser } from '../types';
import {
  LifecyclePayload,
  CreateAdherentRpcPayload,
  UpdateAdherentPayload,
  adherentsRepository,
} from '../repositories/adherents.repository';
import { utilisateursRepository } from '../repositories/utilisateurs.repository';
import { auditService } from './audit.service';
import { utilisateursService } from './utilisateurs.service';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

export interface AdherentFormPayload {
  date_souscription: string;
  matricule: string;
  civilite: string;
  nom: string;
  prenoms: string;
  date_naissance: string;
  situation_matrimoniale: string;
  telephone: string;
  email: string;
  emploi: string;
  statut: string;
  grade_id: string;
  grade?: string;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  date_precompte?: string | null;
  nb_trimestre: number;
  cotisation_es: number;
}

export interface AdherentLifecyclePayload {
  action: 'ACTIVER' | 'DESACTIVER' | 'RETRAITE' | 'DECES';
  motif?: string;
}

export interface CreateAdherentAccessPayload {
  email?: string;
  telephone?: string | null;
  password: string;
}

type AdherentViewRow = Record<string, any>;

function normalizeAdherent(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row;
  const adherent = row as AdherentViewRow;
  const idAdherent = adherent.id_adherent ?? adherent.id;

  return {
    ...adherent,
    id: String(idAdherent ?? ''),
    id_adherent: idAdherent,
    grade_id: String(adherent.id_grade ?? adherent.grade_id ?? ''),
    grade_code: adherent.grade_code ?? adherent.grade ?? '',
    grade_libelle: adherent.grade_libelle ?? adherent.grade ?? null,
  };
}

function actor(user: AuthenticatedUser): string {
  return user.email || user.matricule || user.id_utilisateur;
}

function ensureCanAccessAdherent(user: AuthenticatedUser, adherent: unknown): void {
  if (user.role !== 'ADHERENT') return;

  const row = adherent as { id_adherent?: unknown };
  if (!user.id_adherent || String(row.id_adherent ?? '') !== String(user.id_adherent)) {
    throw new AppError(403, 'Acces refuse a cet adherent');
  }
}

function toCreateRpcPayload(user: AuthenticatedUser, payload: AdherentFormPayload): CreateAdherentRpcPayload {
  const statutStr = payload.statut || 'ACTIF';
  return {
    p_matricule: payload.matricule,
    p_nom: payload.nom,
    p_prenoms: payload.prenoms,
    p_civilite: payload.civilite,
    p_telephone: payload.telephone,
    p_email: payload.email,
    p_date_naissance: payload.date_naissance,
    p_emploi: payload.emploi,
    p_situation_matrimoniale: payload.situation_matrimoniale,
    p_date_souscription: payload.date_souscription,
    p_statut: statutStr === 'ACTIF',
    p_etat: statutStr,
    p_grade: payload.grade || '',
    p_id_grade: Number(payload.grade_id) || null,
    p_date_effet: payload.date_effet,
    p_date_retraite: payload.date_retraite,
    p_age_retraite: Number(payload.age_retraite) || 60,
    p_cotisation_annuelle: Number(payload.cotisation_annuelle) || 0,
    p_date_precompte: payload.date_precompte || null,
    p_cotisation_es: Number(payload.cotisation_es) || 0,
    p_nb_trimestre: Number(payload.nb_trimestre) || 0,
    p_utilisateur: user.matricule || user.email || payload.matricule,
  };
}

function toUpdatePayload(payload: AdherentFormPayload): UpdateAdherentPayload {
  return {
    date_souscription: payload.date_souscription,
    matricule: payload.matricule,
    civilite: payload.civilite,
    nom: payload.nom,
    prenoms: payload.prenoms,
    telephone: payload.telephone,
    email: payload.email,
    statut: payload.statut,
    date_naissance: payload.date_naissance,
    situation_matrimoniale: payload.situation_matrimoniale,
    emploi: payload.emploi,
    grade_id: payload.grade_id,
    grade: payload.grade,
    date_precompte: payload.date_precompte || null,
    date_effet: payload.date_effet,
    date_retraite: payload.date_retraite,
    age_retraite: Number(payload.age_retraite),
    cotisation_annuelle: Number(payload.cotisation_annuelle),
    cotisation_es: Number(payload.cotisation_es),
    nb_trimestre: Number(payload.nb_trimestre),
  };
}

function lifecycleToPayload(action: AdherentLifecyclePayload['action']): LifecyclePayload {
  switch (action) {
    case 'ACTIVER':
      return { statut: true, etat: 'ACTIF', decede: false, retraite: false };
    case 'DESACTIVER':
      return { statut: false, etat: 'INACTIF', decede: false, retraite: false };
    case 'RETRAITE':
      return { statut: false, etat: 'RETRAITE', decede: false, retraite: true };
    case 'DECES':
      return { statut: false, etat: 'DECEDE', decede: true, retraite: false };
  }
}

function lifecycleLabel(action: AdherentLifecyclePayload['action']): string {
  switch (action) {
    case 'ACTIVER':
      return 'activation';
    case 'DESACTIVER':
      return 'desactivation';
    case 'RETRAITE':
      return 'passage a la retraite';
    case 'DECES':
      return 'declaration de deces';
  }
}

export const adherentsService = {
  async getAll(filters?: { search?: string; statut?: string; idAdherent?: string }) {
    const result = await adherentsRepository.findAll(filters);
    return {
      data: result.data.map(normalizeAdherent),
      error: result.error,
    };
  },

  async getById(user: AuthenticatedUser, id: string): Promise<unknown | null> {
    const adherent = await adherentsRepository.findById(id);
    if (!adherent) {
      throw new AppError(404, 'Adherent introuvable');
    }
    ensureCanAccessAdherent(user, adherent);
    return normalizeAdherent(adherent);
  },

  async create(user: AuthenticatedUser, payload: AdherentFormPayload): Promise<unknown> {
    if (!payload.grade_id) {
      throw new AppError(400, 'Le grade professionnel est obligatoire');
    }
    const data = await adherentsRepository.createComplete(toCreateRpcPayload(user, payload));
    await auditService
      .logEvent(user, {
        action: 'CREATION_ADHERENT',
        objetAudit: 'ADHERENT',
        idObjet: payload.matricule,
        details: `Creation de l'adherent ${payload.matricule} - ${payload.nom} ${payload.prenoms}.`,
      })
      .catch(() => undefined);
    return data;
  },

  async update(user: AuthenticatedUser, id: string, payload: AdherentFormPayload): Promise<unknown> {
    const existing = await adherentsRepository.findById(id);
    if (!existing) {
      throw new AppError(404, 'Adherent introuvable');
    }

    const updated = await adherentsRepository.update(id, toUpdatePayload(payload));
    await auditService
      .logEvent(user, {
        action: 'MODIFICATION_ADHERENT',
        objetAudit: 'ADHERENT',
        idObjet: id,
        details: `Modification de la fiche adherent ${payload.matricule} par ${actor(user)}.`,
      })
      .catch(() => undefined);
    return normalizeAdherent(updated ?? { id });
  },

  async changeLifecycle(user: AuthenticatedUser, id: string, payload: AdherentLifecyclePayload): Promise<unknown> {
    const existing = normalizeAdherent(await adherentsRepository.findById(id)) as AdherentViewRow | null;
    if (!existing) {
      throw new AppError(404, 'Adherent introuvable');
    }

    const updated = normalizeAdherent(
      await adherentsRepository.updateLifecycle(id, lifecycleToPayload(payload.action)),
    ) as AdherentViewRow;

    const linkedUser =
      (existing.id_adherent ? await utilisateursRepository.findByAdherentId(Number(existing.id_adherent)) : null) ||
      (existing.matricule ? await utilisateursRepository.findByMatricule(String(existing.matricule)) : null);

    if (linkedUser && ['ACTIVER', 'DESACTIVER', 'DECES'].includes(payload.action)) {
      await utilisateursRepository.update(linkedUser.id_utilisateur, {
        user_actif: payload.action === 'ACTIVER',
        auditUserId: Number.isInteger(Number(user.id_utilisateur)) ? Number(user.id_utilisateur) : null,
      });
    }

    await auditService
      .logEvent(user, {
        action: `ADHERENT_${payload.action}`,
        objetAudit: 'ADHERENT',
        idObjet: existing.id_adherent ?? id,
        details: `${lifecycleLabel(payload.action)} de l'adherent ${existing.matricule}. Motif : ${payload.motif || 'non renseigne'}.`,
      })
      .catch(() => undefined);

    return updated;
  },

  async createLinkedAccess(user: AuthenticatedUser, id: string, payload: CreateAdherentAccessPayload): Promise<unknown> {
    const adherent = normalizeAdherent(await adherentsRepository.findById(id)) as AdherentViewRow | null;
    if (!adherent) {
      throw new AppError(404, 'Adherent introuvable');
    }
    if (!payload.password || !isStrongPassword(payload.password)) {
      throw new AppError(400, PASSWORD_POLICY_MESSAGE);
    }

    const data = await utilisateursService.create(user, {
      matricule: String(adherent.matricule),
      email: payload.email || String(adherent.email || ''),
      password: payload.password,
      profil: 'ADHERENT',
      telephone: payload.telephone !== undefined ? payload.telephone : adherent.telephone ?? null,
      user_actif: true,
      id_adherent: Number(adherent.id_adherent),
    });

    await auditService
      .logEvent(user, {
        action: 'CREATION_ACCES_ADHERENT',
        objetAudit: 'ADHERENT',
        idObjet: adherent.id_adherent,
        details: `Creation ou reparation de l'acces utilisateur lie a l'adherent ${adherent.matricule}.`,
      })
      .catch(() => undefined);

    return data;
  },

  async getHistory(user: AuthenticatedUser, id: string): Promise<unknown[]> {
    const adherent = await adherentsRepository.findById(id);
    if (!adherent) {
      throw new AppError(404, 'Adherent introuvable');
    }
    ensureCanAccessAdherent(user, adherent);

    return auditService.getLogs({ objetAudit: 'ADHERENT', idObjet: id });
  },

  async getActiveCivilites(): Promise<unknown[]> {
    return adherentsRepository.findActiveCivilites();
  },

  async getActiveSituationsMatrimoniales(): Promise<unknown[]> {
    return adherentsRepository.findActiveSituationsMatrimoniales();
  },

  async getActiveEmplois(): Promise<unknown[]> {
    return adherentsRepository.findActiveEmplois();
  },

  async getActiveFonctions(): Promise<unknown[]> {
    return adherentsRepository.findActiveFonctions();
  },

  async getActiveGrades(): Promise<unknown[]> {
    return adherentsRepository.findActiveGrades();
  },
};
