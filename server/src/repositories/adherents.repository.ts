import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface CreateAdherentRpcPayload {
  p_matricule: string;
  p_nom: string;
  p_prenoms: string;
  p_civilite: string;
  p_telephone: string;
  p_email: string;
  p_date_naissance: string;
  p_emploi: string;
  p_situation_matrimoniale: string;
  p_date_souscription: string;
  p_statut: boolean;
  p_etat: string;
  p_grade: string;
  p_id_grade: number | null;
  p_date_effet: string;
  p_date_retraite: string;
  p_age_retraite: number;
  p_cotisation_annuelle: number;
  p_date_precompte: string | null;
  p_cotisation_es: number;
  p_nb_trimestre: number;
  p_utilisateur: string;
}

export interface UpdateAdherentPayload {
  date_souscription: string;
  matricule: string;
  civilite: string;
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  statut: string;
  date_naissance: string;
  situation_matrimoniale: string;
  emploi: string;
  grade_id: string;
  grade?: string;
  date_precompte?: string | null;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  cotisation_es: number;
  nb_trimestre: number;
}

export interface LifecyclePayload {
  statut: boolean;
  etat: 'ACTIF' | 'INACTIF' | 'RETRAITE' | 'DECEDE';
  decede: boolean;
  retraite: boolean;
}

export const adherentsRepository = {
  async findAll(filters?: {
    search?: string;
    statut?: string;
    idAdherent?: string;
  }): Promise<{ data: unknown[]; error: string | null }> {
    try {
      const supabase = getSupabaseServer();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('v_adherents_complets')
        .select('*')
        .not('etat', 'in', '("EN_ATTENTE","REJETE")');

      if (filters?.idAdherent) {
        query = query.eq('id_adherent', filters.idAdherent);
      }

      if (filters?.statut && filters.statut !== 'TOUS') {
        switch (filters.statut) {
          case 'ACTIF':
            query = query.eq('statut', true).eq('decede', false).eq('retraite', false);
            break;
          case 'RETRAITE':
            query = query.eq('retraite', true);
            break;
          case 'DECEDE':
            query = query.eq('decede', true);
            break;
          case 'INACTIF':
            query = query.eq('statut', false).eq('decede', false).eq('retraite', false);
            break;
        }
      }

      if (filters?.search) {
        const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'nom', 'prenoms']);
        if (orFilter) query = query.or(orFilter);
      }

      const { data, error } = await query.order('nom', { ascending: true });

      if (error) {
        return { data: [], error: (error as { message: string }).message };
      }
      return { data: (data as unknown[]) ?? [], error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur dépôt adhérents';
      return { data: [], error: msg };
    }
  },

  async findById(id: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select('*')
      .eq('id_adherent', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async createComplete(payload: CreateAdherentRpcPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('rpc_creer_adherent_complet', payload);

    if (error) throw new Error(error.message);
    return data;
  },

  async update(id: string, payload: UpdateAdherentPayload): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const statutActif = payload.statut === 'ACTIF';
    const basePayload = {
      date_souscription: payload.date_souscription,
      matricule: payload.matricule,
      civilite: payload.civilite,
      nom: payload.nom,
      prenoms: payload.prenoms,
      telephone: payload.telephone,
      email: payload.email,
      statut: statutActif,
      etat: payload.statut,
      decede: payload.statut === 'DECEDE',
      retraite: payload.statut === 'RETRAITE',
      date_naissance: payload.date_naissance,
      situation_matrimoniale: payload.situation_matrimoniale,
      emploi: payload.emploi,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('adherents')
      .update(basePayload)
      .eq('id_adherent', id);

    if (error) throw new Error(error.message);

    const infoPayload = {
      grade: payload.grade || null,
      id_grade: Number(payload.grade_id) || null,
      date_naissance: payload.date_naissance,
      date_retraite: payload.date_retraite,
      age_retraite: payload.age_retraite,
      cotisation_annuelle: payload.cotisation_annuelle,
      date_precompte: payload.date_precompte || null,
      date_effet: payload.date_effet,
      nb_trimestre: payload.nb_trimestre,
      cotisation_es: payload.cotisation_es,
      updated_at: new Date().toISOString(),
    };

    const { error: infoError } = await supabase
      .from('info_cotisations')
      .update(infoPayload)
      .eq('id_adherent', id)
      .eq('info_actif', true);

    if (infoError) throw new Error(infoError.message);
    return this.findById(id);
  },

  async updateLifecycle(id: string, payload: LifecyclePayload): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('adherents')
      .update({
        statut: payload.statut,
        etat: payload.etat,
        decede: payload.decede,
        retraite: payload.retraite,
        updated_at: new Date().toISOString(),
      })
      .eq('id_adherent', id);

    if (error) throw new Error(error.message);
    return this.findById(id);
  },

  async findActiveCivilites(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('civilites')
      .select('*')
      .or('actif.is.null,actif.eq.true')
      .order('libelle_civilite');

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findActiveSituationsMatrimoniales(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('situations_matrimoniales')
      .select('*')
      .or('actif.is.null,actif.eq.true')
      .order('libelle_situation');

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findActiveEmplois(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('emplois')
      .select('*')
      .or('actif.is.null,actif.eq.true')
      .order('libelle_emploi');

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findActiveFonctions(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('fonctions')
      .select('*')
      .eq('actif', true)
      .order('libelle_fonction');

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findActiveGrades(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('grades')
      .select('id_grade, libelle_grade, age_retraite, cotisation_annuelle, actif')
      .or('actif.is.null,actif.eq.true')
      .order('libelle_grade');

    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
