import type { User } from '@supabase/supabase-js';
import { getSupabaseServer } from '../config/supabaseServer';
import { UserProfile } from '../types';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface UtilisateurFilters {
  search?: string;
  profil?: string;
  actif?: string;
}

export interface UtilisateurRow {
  id_utilisateur: number;
  auth_user_id: string | null;
  matricule: string | null;
  email: string | null;
  telephone: string | null;
  user_actif: boolean | null;
  profil: string | null;
  id_adherent: number | null;
  date_creation: string | null;
  cree_par: string | null;
  date_modif: string | null;
  modif_par: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LinkedAdherent {
  id_adherent: number;
  matricule: string;
  nom: string | null;
  prenoms: string | null;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
}

export interface UtilisateurUpsertInput {
  auth_user_id: string;
  matricule: string;
  email: string;
  telephone?: string | null;
  user_actif: boolean;
  profil: string;
  id_adherent?: number | null;
  auditUserId: number | null;
}

export interface UtilisateurUpdateInput {
  auth_user_id?: string | null;
  email?: string;
  telephone?: string | null;
  user_actif?: boolean;
  profil?: string;
  id_adherent?: number | null;
  auditUserId: number | null;
}

const USER_SELECT =
  'id_utilisateur, auth_user_id, matricule, email, telephone, user_actif, profil, id_adherent, date_creation, cree_par, date_modif, modif_par, created_at, updated_at';

export const utilisateursRepository = {
  async findAll(filters?: UtilisateurFilters): Promise<UtilisateurRow[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('utilisateurs').select(USER_SELECT);

    if (filters?.search) {
      const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'email', 'telephone']);
      if (orFilter) query = query.or(orFilter);
    }
    if (filters?.profil && filters.profil !== 'TOUS') {
      query = query.eq('profil', filters.profil);
    }
    if (filters?.actif === 'true') {
      query = query.eq('user_actif', true);
    }
    if (filters?.actif === 'false') {
      query = query.eq('user_actif', false);
    }

    const { data, error } = await query.order('id_utilisateur', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as UtilisateurRow[];
  },

  async findById(id: number): Promise<UtilisateurRow | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('utilisateurs')
      .select(USER_SELECT)
      .eq('id_utilisateur', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as UtilisateurRow | null) ?? null;
  },

  async findByMatricule(matricule: string): Promise<UtilisateurRow | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('utilisateurs')
      .select(USER_SELECT)
      .eq('matricule', matricule)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as UtilisateurRow | null) ?? null;
  },

  async findByAdherentId(idAdherent: number): Promise<UtilisateurRow | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('utilisateurs')
      .select(USER_SELECT)
      .eq('id_adherent', idAdherent)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as UtilisateurRow | null) ?? null;
  },

  async findAdherentByMatricule(matricule: string): Promise<LinkedAdherent | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select('id_adherent, matricule, nom, prenoms, email, telephone, date_naissance')
      .eq('matricule', matricule)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as LinkedAdherent | null) ?? null;
  },

  async getAuthUserById(authUserId: string): Promise<User | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.admin.getUserById(authUserId);
    if (error) return null;
    return data.user ?? null;
  },

  async generateRecoveryLink(email: string, redirectTo: string): Promise<string> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });

    if (error) throw new Error(error.message);
    return data.properties.action_link;
  },

  async create(input: UtilisateurUpsertInput): Promise<UtilisateurRow> {
    const supabase = getSupabaseServer();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('utilisateurs')
      .insert({
        auth_user_id: input.auth_user_id,
        matricule: input.matricule,
        email: input.email,
        telephone: input.telephone ?? null,
        user_actif: input.user_actif,
        profil: input.profil,
        id_adherent: input.id_adherent ?? null,
        date_creation: now,
        cree_par: input.auditUserId,
      })
      .select(USER_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as UtilisateurRow;
  },

  async update(id: number, input: UtilisateurUpdateInput): Promise<UtilisateurRow> {
    const supabase = getSupabaseServer();
    const update: Record<string, unknown> = {
      date_modif: new Date().toISOString(),
      modif_par: input.auditUserId,
    };

    if (input.auth_user_id !== undefined) update.auth_user_id = input.auth_user_id;
    if (input.email !== undefined) update.email = input.email;
    if (input.telephone !== undefined) update.telephone = input.telephone;
    if (input.user_actif !== undefined) update.user_actif = input.user_actif;
    if (input.profil !== undefined) update.profil = input.profil;
    if (input.id_adherent !== undefined) update.id_adherent = input.id_adherent;

    const { data, error } = await supabase
      .from('utilisateurs')
      .update(update)
      .eq('id_utilisateur', id)
      .select(USER_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as UtilisateurRow;
  },

  async listAuthUsers(): Promise<User[]> {
    const supabase = getSupabaseServer();
    const users: User[] = [];
    let page = 1;

    while (page <= 20) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw new Error(error.message);

      users.push(...data.users);
      if (data.users.length < 100) break;
      page += 1;
    }

    return users;
  },

  async createAuthUser(input: {
    email: string;
    password: string;
    matricule: string;
    profil: string;
    must_change_password?: boolean;
  }): Promise<User> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        matricule: input.matricule,
        profil: input.profil,
        must_change_password: Boolean(input.must_change_password),
      },
    });

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Utilisateur de connexion non cree');
    return data.user;
  },

  async updateAuthUser(
    authUserId: string,
    input: { email?: string; password?: string; matricule?: string; profil?: string; must_change_password?: boolean },
  ): Promise<User> {
    const supabase = getSupabaseServer();
    const update: Record<string, unknown> = {};
    const userMetadata: Record<string, unknown> = {};

    if (input.email !== undefined) {
      update.email = input.email;
      update.email_confirm = true;
    }
    if (input.password !== undefined) update.password = input.password;
    if (input.matricule !== undefined) userMetadata.matricule = input.matricule;
    if (input.profil !== undefined) userMetadata.profil = input.profil;
    if (input.must_change_password !== undefined) userMetadata.must_change_password = input.must_change_password;
    if (Object.keys(userMetadata).length > 0) update.user_metadata = userMetadata;

    const { data, error } = await supabase.auth.admin.updateUserById(authUserId, update);

    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Utilisateur de connexion introuvable');
    return data.user;
  },
};
