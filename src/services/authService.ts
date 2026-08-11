import { supabase } from './supabaseClient';
import { DBUser, UserProfile } from '../types';
import { apiGet, apiPost } from '../lib/apiClient';
import { toFrenchErrorMessage } from '../utils/errorMessages';

type ApiResponse<T> = { data: T; error: string | null };

export const authService = {
  async login(email: string, password: string): Promise<{ user: DBUser | null; error: Error | null }> {
    try {
      if ((import.meta as any).env.DEV) {
        console.info('[AUTH] login() called', { email });
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if ((import.meta as any).env.DEV) {
          console.error('[AUTH] signInWithPassword error', { message: error.message, status: (error as any).status });
        }
        throw new Error(toFrenchErrorMessage(error.message));
      }
      if (!data.user) throw new Error('Connexion incomplète. Veuillez réessayer.');

      if ((import.meta as any).env.DEV) {
        console.info('[AUTH] signInWithPassword success', { userId: data.user.id, email: data.user.email });
      }

      const profile = await this.getUserProfile(data.user.id);
      return {
        user: {
          ...profile,
          must_change_password: Boolean(data.user.user_metadata?.must_change_password ?? profile.must_change_password),
        },
        error: null,
      };
    } catch (e: any) {
      return { user: null, error: new Error(toFrenchErrorMessage(e)) };
    }
  },

  async logout(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('madgi_user_session');
      return { error: null };
    } catch (e: any) {
      console.error('Erreur de deconnexion:', e);
      return { error: new Error(toFrenchErrorMessage(e)) };
    }
  },

  async getCurrentUser(): Promise<DBUser | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        if ((import.meta as any).env.DEV) {
          const rawDemoUser = localStorage.getItem('madgi_user_session');
          if (rawDemoUser) {
            try {
              return JSON.parse(rawDemoUser) as DBUser;
            } catch {
              localStorage.removeItem('madgi_user_session');
            }
          }
        }
        return null;
      }
      const profile = await this.getUserProfile(session.user.id);
      return {
        ...profile,
        must_change_password: Boolean(session.user.user_metadata?.must_change_password ?? profile.must_change_password),
      };
    } catch (e) {
      console.error('Erreur recuperation session:', e);
      return null;
    }
  },

  async getUserProfile(authUserId: string): Promise<DBUser> {
    if ((import.meta as any).env.DEV) {
      console.info('[AUTH] getUserProfile()', { authUserId });
    }

    const { data, error } = await apiGet<ApiResponse<DBUser>>('/api/auth/me');

    if ((import.meta as any).env.DEV) {
      console.info('[AUTH] getUserProfile api', { data, error });
    }

    if (error) {
      throw new Error(toFrenchErrorMessage(error));
    }
    if (data?.error) {
      throw new Error(toFrenchErrorMessage(data.error));
    }
    if (!data?.data) {
      throw new Error(`Profil metier ESR introuvable pour auth_user_id = ${authUserId}`);
    }

    return data.data;
  },

  async changePassword(newPassword: string): Promise<{ user: DBUser | null; error: Error | null }> {
    try {
      const { data, error } = await apiPost<ApiResponse<DBUser>>('/api/auth/change-password', {
        new_password: newPassword,
      });

      if (error) throw new Error(toFrenchErrorMessage(error));
      if (data?.error) throw new Error(toFrenchErrorMessage(data.error));
      if (!data?.data) throw new Error('Changement de mot de passe incomplet.');

      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.error) {
        const loginEmail = data.data.email;
        const signedIn = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: newPassword,
        });

        if (signedIn.error || !signedIn.data.session) {
          await supabase.auth.signOut();
          throw new Error('Mot de passe change. Veuillez vous reconnecter avec votre nouveau mot de passe.');
        }
      }

      return { user: { ...data.data, must_change_password: false }, error: null };
    } catch (e: any) {
      return { user: null, error: new Error(toFrenchErrorMessage(e)) };
    }
  },

  async checkFirstLogin(matricule: string): Promise<{ firstLogin: boolean } | null> {
    const { data, error } = await apiPost<ApiResponse<{ firstLogin: boolean }>>(
      '/api/auth/first-login/check',
      { matricule },
    );
    if (error) throw new Error(toFrenchErrorMessage(error));
    if (data?.error) throw new Error(toFrenchErrorMessage(data.error));
    if (!data?.data) throw new Error('Verification impossible. Veuillez reessayer.');
    return data.data;
  },

  async sendFirstLoginOtp(matricule: string): Promise<{
    maskedPhone: string;
    expiresInSeconds: number;
    smsSkipped?: boolean;
    debugOtpCode?: string;
  } | null> {
    const { data, error } = await apiPost<ApiResponse<{
      maskedPhone: string;
      expiresInSeconds: number;
      smsSkipped?: boolean;
      debugOtpCode?: string;
    }>>(
      '/api/auth/first-login/send-otp',
      { matricule },
    );
    if (error) throw new Error(toFrenchErrorMessage(error));
    if (data?.error) throw new Error(toFrenchErrorMessage(data.error));
    if (!data?.data) throw new Error('Envoi du code SMS impossible. Veuillez reessayer.');
    return data.data;
  },

  async requestPasswordReset(matricule: string): Promise<{ maskedEmail: string | null } | null> {
    const { data, error } = await apiPost<ApiResponse<{ maskedEmail: string | null }>>(
      '/api/auth/password-reset/request',
      { matricule },
    );
    if (error) throw new Error(toFrenchErrorMessage(error));
    if (data?.error) throw new Error(toFrenchErrorMessage(data.error));
    if (!data?.data) throw new Error('Demande impossible. Veuillez réessayer.');
    return data.data;
  },

  async setFirstLoginPassword(input: {
    matricule: string;
    otp_code: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ login: string; email: string } | null> {
    const { data, error } = await apiPost<ApiResponse<{ login: string; email: string }>>(
      '/api/auth/first-login/set-password',
      input,
    );
    if (error) throw new Error(toFrenchErrorMessage(error));
    if (data?.error) throw new Error(toFrenchErrorMessage(data.error));
    if (!data?.data) throw new Error('Creation du mot de passe impossible. Veuillez reessayer.');
    return data.data;
  },

  loginAsDemo(role: UserProfile): DBUser {
    if (!(import.meta as any).env.DEV) {
      throw new Error('Connexion demo desactivee hors environnement de developpement.');
    }

    const mockUser: DBUser = {
      id: `demo-${role.toLowerCase()}`,
      matricule: role === 'ADHERENT' ? 'DEMO001' : role === 'GESTIONNAIRE' ? 'DEMO002' : 'DEMO003',
      email: `${role.toLowerCase()}@madgi.ci`,
      nom: role === 'ADHERENT' ? 'KOUADIO' : role === 'GESTIONNAIRE' ? 'DIALLO' : 'SORO',
      prenoms: role === 'ADHERENT' ? 'Jean Marc' : role === 'GESTIONNAIRE' ? 'Mariama' : 'Bakary',
      role,
    };
    localStorage.setItem('madgi_user_session', JSON.stringify(mockUser));
    return mockUser;
  },
};
