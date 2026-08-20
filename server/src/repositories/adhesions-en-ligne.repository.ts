import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export type OnlineAdhesionStatus = 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

export interface OnlineAdhesionPayload {
  date_souscription: string;
  matricule: string;
  civilite: string;
  sexe?: string | null;
  nom: string;
  prenoms: string;
  date_naissance: string;
  lieu_naissance: string;
  situation_matrimoniale: string;
  telephone: string;
  email?: string | null;
  adresse_geographique: string;
  adresse_postale: string;
  direction: string;
  emploi: string;
  grade_id: string;
  grade?: string;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  date_precompte?: string | null;
  nb_trimestre: number;
  cotisation_es: number;
  taux_gar?: number | null;
  frais_rente?: number | null;
  taux_rachat?: number | null;
}

export interface OnlineAdhesionFilters {
  search?: string;
  statut?: 'TOUS' | OnlineAdhesionStatus;
  commercialId?: string;
}

type AdherentRow = Record<string, any>;
type InfoCotisationRow = Record<string, any>;

const ADHERENT_SELECT =
  'id_adherent, matricule, nom, prenoms, civilite, sexe, date_naissance, lieu_naissance, emploi, direction, situation_matrimoniale, email, telephone, adresse_geographique, adresse_postale, date_souscription, statut, etat, decede, adhesion_en_ligne, retraite, commercial_id, source_adhesion, created_at, updated_at';

const INFO_SELECT =
  'id_info_cotisation, id_adherent, grade, id_grade, date_naissance, date_retraite, age_retraite, cotisation_annuelle, date_precompte, date_effet, nb_trimestre, cotisation_es, info_actif, taux_gar, frais_rente, taux_rachat, created_at, updated_at';

function demandeStatus(row: AdherentRow): OnlineAdhesionStatus {
  if (String(row.etat ?? '').toUpperCase() === 'REJETE') return 'REJETE';
  if (row.statut === true || String(row.etat ?? '').toUpperCase() === 'ACTIF') return 'VALIDE';
  return 'EN_ATTENTE';
}

function normalizeOnlineAdhesion(row: AdherentRow, info?: InfoCotisationRow | null): Record<string, unknown> {
  const idAdherent = row.id_adherent;
  return {
    id: String(idAdherent ?? ''),
    id_adherent: idAdherent,
    ...row,
    statut_demande: demandeStatus(row),
    grade_id: info?.id_grade == null ? '' : String(info.id_grade),
    grade: info?.grade ?? '',
    grade_code: info?.grade ?? '',
    grade_libelle: info?.grade ?? null,
    id_info_cotisation: info?.id_info_cotisation ?? null,
    age_retraite: Number(info?.age_retraite ?? 60),
    date_retraite: info?.date_retraite ?? '',
    date_precompte: info?.date_precompte ?? null,
    date_effet: info?.date_effet ?? '',
    nb_trimestre: Number(info?.nb_trimestre ?? 0),
    cotisation_annuelle: Number(info?.cotisation_annuelle ?? 0),
    cotisation_es: Number(info?.cotisation_es ?? 0),
    taux_gar: info?.taux_gar ?? null,
    frais_rente: info?.frais_rente ?? null,
    taux_rachat: info?.taux_rachat ?? null,
  };
}

function toAdherentPayload(payload: OnlineAdhesionPayload, status: OnlineAdhesionStatus): Record<string, unknown> {
  return {
    date_souscription: payload.date_souscription,
    matricule: payload.matricule,
    civilite: payload.civilite,
    sexe: payload.sexe ?? null,
    nom: payload.nom,
    prenoms: payload.prenoms,
    date_naissance: payload.date_naissance,
    lieu_naissance: payload.lieu_naissance,
    situation_matrimoniale: payload.situation_matrimoniale,
    telephone: payload.telephone,
    email: payload.email || null,
    adresse_geographique: payload.adresse_geographique,
    adresse_postale: payload.adresse_postale || null,
    direction: payload.direction,
    emploi: payload.emploi,
    statut: status === 'VALIDE',
    etat: status === 'VALIDE' ? 'ACTIF' : status,
    decede: false,
    retraite: false,
    adhesion_en_ligne: true,
    updated_at: new Date().toISOString(),
  };
}

function toInfoPayload(idAdherent: number, payload: OnlineAdhesionPayload, active: boolean): Record<string, unknown> {
  return {
    id_adherent: idAdherent,
    grade: payload.grade || null,
    id_grade: Number(payload.grade_id) || null,
    date_naissance: payload.date_naissance,
    date_retraite: payload.date_retraite,
    age_retraite: Number(payload.age_retraite) || 60,
    cotisation_annuelle: Number(payload.cotisation_annuelle) || 0,
    date_precompte: payload.date_precompte || null,
    date_effet: payload.date_effet,
    nb_trimestre: Number(payload.nb_trimestre) || 0,
    cotisation_es: Number(payload.cotisation_es) || 0,
    info_actif: active,
    taux_gar: payload.taux_gar ?? null,
    frais_rente: payload.frais_rente ?? null,
    taux_rachat: payload.taux_rachat ?? null,
    updated_at: new Date().toISOString(),
  };
}

async function findInfoByAdherentIds(ids: number[]): Promise<Map<number, InfoCotisationRow>> {
  const infos = new Map<number, InfoCotisationRow>();
  if (ids.length === 0) return infos;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('info_cotisations')
    .select(INFO_SELECT)
    .in('id_adherent', ids)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as InfoCotisationRow[]) {
    const id = Number(row.id_adherent);
    const existing = infos.get(id);
    if (!existing || (!existing.info_actif && row.info_actif)) {
      infos.set(id, row);
    }
  }
  return infos;
}

async function findLatestInfo(idAdherent: number): Promise<InfoCotisationRow | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('info_cotisations')
    .select(INFO_SELECT)
    .eq('id_adherent', idAdherent)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as InfoCotisationRow | null) ?? null;
}

async function saveInfo(idAdherent: number, payload: OnlineAdhesionPayload, active: boolean): Promise<InfoCotisationRow> {
  const supabase = getSupabaseServer();

  if (active) {
    const { error } = await supabase
      .from('info_cotisations')
      .update({ info_actif: false, updated_at: new Date().toISOString() })
      .eq('id_adherent', idAdherent);
    if (error) throw new Error(error.message);
  }

  const latest = await findLatestInfo(idAdherent);
  const infoPayload = toInfoPayload(idAdherent, payload, active);

  if (latest?.id_info_cotisation) {
    const { data, error } = await supabase
      .from('info_cotisations')
      .update(infoPayload)
      .eq('id_info_cotisation', latest.id_info_cotisation)
      .select(INFO_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return data as InfoCotisationRow;
  }

  const { data, error } = await supabase
    .from('info_cotisations')
    .insert(infoPayload)
    .select(INFO_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return data as InfoCotisationRow;
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

export const adhesionsEnLigneRepository = {
  async commercialActivity(): Promise<{ commerciaux: Record<string, unknown>[]; dossiers: Record<string, unknown>[] }> {
    const supabase = getSupabaseServer();
    const [{ data: users, error: usersError }, { data: dossiers, error: dossiersError }] = await Promise.all([
      supabase
        .from('utilisateurs')
        .select('id_utilisateur, matricule, email, user_actif')
        .eq('profil', 'COMMERCIAL')
        .order('matricule'),
      supabase
        .from('adherents')
        .select('id_adherent, commercial_id, matricule, nom, prenoms, statut, etat, created_at')
        .eq('adhesion_en_ligne', true)
        .not('commercial_id', 'is', null)
        .order('created_at', { ascending: false }),
    ]);
    if (usersError) throw new Error(usersError.message);
    if (dossiersError) throw new Error(dossiersError.message);
    return {
      commerciaux: (users ?? []) as Record<string, unknown>[],
      dossiers: (dossiers ?? []) as Record<string, unknown>[],
    };
  },

  async list(filters?: OnlineAdhesionFilters): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('adherents').select(ADHERENT_SELECT).eq('adhesion_en_ligne', true);
    const status = filters?.statut ?? 'EN_ATTENTE';

    if (status === 'EN_ATTENTE') {
      query = query.eq('statut', false).neq('etat', 'REJETE');
    } else if (status === 'VALIDE') {
      query = query.eq('statut', true).eq('etat', 'ACTIF');
    } else if (status === 'REJETE') {
      query = query.eq('etat', 'REJETE');
    }

    if (filters?.search) {
      const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'nom', 'prenoms']);
      if (orFilter) query = query.or(orFilter);
    }
    if (filters?.commercialId) query = query.eq('commercial_id', filters.commercialId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as AdherentRow[];
    const infoById = await findInfoByAdherentIds(rows.map((row) => Number(row.id_adherent)).filter(Boolean));
    return rows.map((row) => normalizeOnlineAdhesion(row, infoById.get(Number(row.id_adherent))));
  },

  async findById(id: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select(ADHERENT_SELECT)
      .eq('id_adherent', id)
      .eq('adhesion_en_ligne', true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const info = await findLatestInfo(Number((data as AdherentRow).id_adherent));
    return normalizeOnlineAdhesion(data as AdherentRow, info);
  },

  async findByMatricule(matricule: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select(ADHERENT_SELECT)
      .eq('matricule', matricule)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const info = await findLatestInfo(Number((data as AdherentRow).id_adherent));
    return normalizeOnlineAdhesion(data as AdherentRow, info);
  },

  async createPending(payload: OnlineAdhesionPayload, attribution?: { commercialId?: string; source?: string }): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .insert({
        ...toAdherentPayload(payload, 'EN_ATTENTE'),
        commercial_id: attribution?.commercialId ? Number(attribution.commercialId) : null,
        source_adhesion: attribution?.source ?? 'EN_LIGNE',
        created_at: new Date().toISOString(),
      })
      .select(ADHERENT_SELECT)
      .single();

    if (error) throw new Error(error.message);

    const row = data as AdherentRow;
    const info = await saveInfo(Number(row.id_adherent), payload, false);
    return normalizeOnlineAdhesion(row, info);
  },

  async update(id: string, payload: OnlineAdhesionPayload, status: OnlineAdhesionStatus): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .update(toAdherentPayload(payload, status))
      .eq('id_adherent', id)
      .eq('adhesion_en_ligne', true)
      .select(ADHERENT_SELECT)
      .single();

    if (error) throw new Error(error.message);

    const row = data as AdherentRow;
    const info = await saveInfo(Number(row.id_adherent), payload, status === 'VALIDE');
    if (status === 'VALIDE') await ensureCompteEsr(Number(row.id_adherent));
    return normalizeOnlineAdhesion(row, info);
  },

  async reject(id: string): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .update({
        statut: false,
        etat: 'REJETE',
        updated_at: new Date().toISOString(),
      })
      .eq('id_adherent', id)
      .eq('adhesion_en_ligne', true)
      .select(ADHERENT_SELECT)
      .single();

    if (error) throw new Error(error.message);

    const row = data as AdherentRow;
    const info = await findLatestInfo(Number(row.id_adherent));
    return normalizeOnlineAdhesion(row, info);
  },
};
