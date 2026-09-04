import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface CreateAdherentPayload {
  date_souscription: string;
  matricule: string;
  civilite: string;
  nom: string;
  prenoms: string;
  telephone: string;
  email: string;
  statut: string;
  date_naissance: string;
  lieu_naissance: string;
  situation_matrimoniale: string;
  adresse_geographique: string;
  adresse_postale: string;
  direction: string;
  emploi: string;
  grade_id: string;
  grade?: string;
  date_precompte?: string | null;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  cotisation_es: number;
  cotisation_es_avant_abattement?: number | null;
  taux_abattement_promo?: number | null;
  palier_abattement_promo?: number | null;
  nb_trimestre: number;
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
  lieu_naissance: string;
  situation_matrimoniale: string;
  adresse_geographique: string;
  adresse_postale: string;
  direction: string;
  emploi: string;
  grade_id: string;
  grade?: string;
  date_precompte?: string | null;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  cotisation_es: number;
  cotisation_es_avant_abattement?: number | null;
  taux_abattement_promo?: number | null;
  palier_abattement_promo?: number | null;
  nb_trimestre: number;
}

export interface LifecyclePayload {
  statut: boolean;
  etat: 'ACTIF' | 'INACTIF' | 'RETRAITE' | 'DECEDE';
  decede: boolean;
  retraite: boolean;
}

export interface AdherentListFilters {
  search?: string;
  statut?: string;
  dateInscription?: string;
  direction?: string;
  categorie?: string;
  trimestrePremierPrecompte?: string;
  idAdherent?: string;
}

export interface AdherentFilterOptions {
  directions: string[];
  categories: string[];
  trimestresPremierPrecompte: string[];
}

function premierPrecompteDateRange(trimestre: string): { debut: string; fin: string } | null {
  const match = /^(\d{4})-T([1-4])$/.exec(trimestre);
  if (!match) return null;

  const annee = match[1];
  const bornes: Record<string, [string, string]> = {
    '1': ['01-01', '03-31'],
    '2': ['04-01', '06-30'],
    '3': ['07-01', '09-30'],
    '4': ['10-01', '12-31'],
  };
  const [debut, fin] = bornes[match[2]];
  return { debut: `${annee}-${debut}`, fin: `${annee}-${fin}` };
}

function trimestreFromDate(value: unknown): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(String(value ?? ''));
  if (!match) return null;
  const mois = Number(match[2]);
  if (mois < 1 || mois > 12) return null;
  return `${match[1]}-T${Math.ceil(mois / 3)}`;
}

function uniqueSorted(values: unknown[]): string[] {
  return Array.from(
    new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' }));
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

function adherentBasePayload(payload: CreateAdherentPayload | UpdateAdherentPayload) {
  const statutActif = payload.statut === 'ACTIF';

  return {
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
    lieu_naissance: payload.lieu_naissance,
    situation_matrimoniale: payload.situation_matrimoniale,
    adresse_geographique: payload.adresse_geographique,
    adresse_postale: payload.adresse_postale,
    direction: payload.direction,
    emploi: payload.emploi,
    updated_at: new Date().toISOString(),
  };
}

function infoCotisationPayload(idAdherent: number | string, payload: CreateAdherentPayload | UpdateAdherentPayload) {
  return {
    id_adherent: Number(idAdherent),
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
    cotisation_es_avant_abattement: payload.cotisation_es_avant_abattement ?? null,
    taux_abattement_promo: payload.taux_abattement_promo ?? null,
    palier_abattement_promo: payload.palier_abattement_promo ?? null,
    updated_at: new Date().toISOString(),
  };
}

function throwSupabaseWriteError(error: { message: string; code?: string }): never {
  const message = error.message.toLowerCase();
  if (
    error.code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('violates unique constraint')
  ) {
    const conflict = new Error(
      message.includes('email')
        ? 'Cette adresse email est déjà utilisée. Renseignez une autre adresse ou vérifiez la fiche existante.'
        : 'Ce matricule est déjà enregistré. Vérifiez le matricule ou recherchez la fiche existante.',
    ) as Error & { statusCode?: number };
    conflict.statusCode = 409;
    throw conflict;
  }

  throw new Error(error.message);
}

async function ensureCompteEsr(idAdherent: number): Promise<void> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('comptes_esr')
    .select('id_compte_esr')
    .eq('id_adherent', idAdherent)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return;

  const today = new Date().toISOString().split('T')[0];
  const { error: insertError } = await supabase.from('comptes_esr').insert({
    id_adherent: idAdherent,
    capital_acquis: 0,
    pm: 0,
    pp: 0,
    pu: 0,
    valeur_rachat: 0,
    date_calcul: today,
    version_calc: 'V1',
  });

  if (insertError) throw new Error(insertError.message);
}

export const adherentsRepository = {
  async findAll(filters?: AdherentListFilters): Promise<{ data: unknown[]; error: string | null }> {
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

      if (filters?.dateInscription) {
        query = query.eq('date_souscription', filters.dateInscription);
      }

      if (filters?.direction) {
        query = query.eq('direction', filters.direction);
      }

      if (filters?.categorie) {
        query = query.eq('grade', filters.categorie);
      }

      if (filters?.trimestrePremierPrecompte) {
        const range = premierPrecompteDateRange(filters.trimestrePremierPrecompte);
        if (range) {
          query = query.gte('date_precompte', range.debut).lte('date_precompte', range.fin);
        }
      }

      const { data, error } = await query
        .order('date_souscription', { ascending: false })
        .order('id_adherent', { ascending: false });

      if (error) {
        return { data: [], error: (error as { message: string }).message };
      }
      return { data: (data as unknown[]) ?? [], error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur dépôt adhérents';
      return { data: [], error: msg };
    }
  },

  async findFilterOptions(idAdherent?: string): Promise<AdherentFilterOptions> {
    const supabase = getSupabaseServer();
    let query = supabase
      .from('v_adherents_complets')
      .select('direction, grade, date_precompte')
      .not('etat', 'in', '("EN_ATTENTE","REJETE")');

    if (idAdherent) {
      query = query.eq('id_adherent', idAdherent);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      direction?: unknown;
      grade?: unknown;
      date_precompte?: unknown;
    }>;
    const trimestres = uniqueSorted(
      rows.map((row) => trimestreFromDate(row.date_precompte)).filter(Boolean),
    ).reverse();

    return {
      directions: uniqueSorted(rows.map((row) => row.direction)),
      categories: uniqueSorted(rows.map((row) => row.grade)),
      trimestresPremierPrecompte: trimestres,
    };
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

  async findByMatricule(matricule: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select('id_adherent, matricule')
      .eq('matricule', matricule)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findByEmail(email: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select('id_adherent, email')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async createComplete(payload: CreateAdherentPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    let createdAdherentId: number | null = null;

    try {
      const { data, error } = await supabase
        .from('adherents')
        .insert({
          ...adherentBasePayload(payload),
          sexe: sexeFromCivilite(payload.civilite),
          adhesion_en_ligne: false,
          source_adhesion: 'BACKOFFICE',
          created_at: new Date().toISOString(),
        })
        .select('id_adherent')
        .single();

      if (error) throwSupabaseWriteError(error);

      createdAdherentId = Number((data as { id_adherent?: unknown } | null)?.id_adherent);
      if (!Number.isFinite(createdAdherentId) || createdAdherentId <= 0) {
        throw new Error("L'identifiant adherent cree est invalide.");
      }

      const { error: infoError } = await supabase
        .from('info_cotisations')
        .insert({
          ...infoCotisationPayload(createdAdherentId, payload),
          info_actif: true,
          created_at: new Date().toISOString(),
        });

      if (infoError) throw new Error(infoError.message);

      await ensureCompteEsr(createdAdherentId);
      return this.findById(String(createdAdherentId));
    } catch (error) {
      if (createdAdherentId) {
        try {
          await supabase.from('info_cotisations').delete().eq('id_adherent', createdAdherentId);
          await supabase.from('comptes_esr').delete().eq('id_adherent', createdAdherentId);
          await supabase.from('adherents').delete().eq('id_adherent', createdAdherentId);
        } catch {
          // Best-effort cleanup only; preserve the original creation error.
        }
      }
      throw error;
    }
  },

  async update(id: string, payload: UpdateAdherentPayload): Promise<unknown | null> {
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from('adherents')
      .update(adherentBasePayload(payload))
      .eq('id_adherent', id);

    if (error) throw new Error(error.message);

    const { error: infoError } = await supabase
      .from('info_cotisations')
      .update(infoCotisationPayload(id, payload))
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
