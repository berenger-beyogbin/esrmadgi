export interface ExternalAgentInfo {
  matricule: string;
  nom: string;
  prenoms: string;
  date_naissance?: string | null;
  telephone?: string | null;
  email?: string | null;
  direction?: string | null;
  emploi?: string | null;
  grade?: string | null;
  civilite?: string | null;
  situation_matrimoniale?: string | null;
  source: 'MYSQL' | 'SIAPS';
  found: boolean;
  raw?: unknown;
}

export interface SearchAgentResponse {
  found: boolean;
  data: ExternalAgentInfo | null;
  error: string | null;
  alreadyAdherent: boolean;
  adherentId: string | null;
}

export interface ApiListResponse<T = unknown> {
  data: T[];
  error: string | null;
}

export type UserProfile = 'ADHERENT' | 'GESTIONNAIRE' | 'ADMINISTRATEUR' | 'SUPERADMIN';

export interface AuthenticatedUser {
  id_utilisateur: string;
  auth_user_id: string;
  matricule: string;
  email: string;
  role: UserProfile;
  id_adherent: string | null;
  must_change_password?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
