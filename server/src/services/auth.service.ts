import { AuthenticatedUser } from '../types';
import { utilisateursRepository } from '../repositories/utilisateurs.repository';

export interface CurrentUserDto {
  id: string;
  auth_user_id: string;
  matricule: string;
  email: string;
  nom: string;
  prenoms: string;
  role: AuthenticatedUser['role'];
  profil: string;
  profil_code: string;
  permissions: string[];
  id_adherent: string | null;
  user_actif: boolean;
  must_change_password: boolean;
}

export const authService = {
  getCurrentUser(user: AuthenticatedUser): CurrentUserDto {
    return {
      id: user.id_utilisateur,
      auth_user_id: user.auth_user_id,
      matricule: user.matricule,
      email: user.email,
      nom: user.matricule || user.email.split('@')[0],
      prenoms: '',
      role: user.role,
      profil: user.profil_code,
      profil_code: user.profil_code,
      permissions: user.permissions,
      id_adherent: user.id_adherent,
      user_actif: true,
      must_change_password: Boolean(user.must_change_password),
    };
  },

  async changePassword(user: AuthenticatedUser, newPassword: string): Promise<CurrentUserDto> {
    await utilisateursRepository.updateAuthUser(user.auth_user_id, {
      password: newPassword,
      matricule: user.matricule,
      profil: user.profil_code,
      must_change_password: false,
    });

    return this.getCurrentUser({
      ...user,
      must_change_password: false,
    });
  },
};
