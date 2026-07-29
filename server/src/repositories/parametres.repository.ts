import { getSupabaseServer } from '../config/supabaseServer';

export type ReferenceKind =
  | 'civilites'
  | 'situationsMatrimoniales'
  | 'emplois'
  | 'liensBeneficiaires'
  | 'fonctions';

interface ReferenceConfig {
  table: string;
  idColumn: string;
  orderBy: string;
}

const referenceConfigs: Record<ReferenceKind, ReferenceConfig> = {
  civilites: {
    table: 'civilites',
    idColumn: 'id_civilite',
    orderBy: 'libelle_civilite',
  },
  situationsMatrimoniales: {
    table: 'situations_matrimoniales',
    idColumn: 'id_situation_matrimoniale',
    orderBy: 'libelle_situation',
  },
  emplois: {
    table: 'emplois',
    idColumn: 'id_emploi',
    orderBy: 'libelle_emploi',
  },
  liensBeneficiaires: {
    table: 'liens_beneficiaires',
    idColumn: 'id_lien_beneficiaire',
    orderBy: 'libelle_lien',
  },
  fonctions: {
    table: 'fonctions',
    idColumn: 'id_fonction',
    orderBy: 'libelle_fonction',
  },
};

async function listRows(table: string, orderBy: string, ascending = true): Promise<unknown[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function insertRow(table: string, payload: Record<string, unknown>): Promise<unknown> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from(table).insert([payload]).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function updateRow(
  table: string,
  idColumn: string,
  id: number,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq(idColumn, id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export const parametresRepository = {
  async findGrades(): Promise<unknown[]> {
    return listRows('grades', 'libelle_grade');
  },

  async createGrade(payload: Record<string, unknown>): Promise<unknown> {
    return insertRow('grades', payload);
  },

  async updateGrade(id: number, payload: Record<string, unknown>): Promise<unknown> {
    return updateRow('grades', 'id_grade', id, payload);
  },

  async findVersions(): Promise<unknown[]> {
    return listRows('parametre_versions', 'date_debut', false);
  },

  async findRepartitions(): Promise<unknown[]> {
    return listRows('param_repartitions', 'date_effet', false);
  },

  async createRepartition(payload: Record<string, unknown>): Promise<unknown> {
    return insertRow('param_repartitions', payload);
  },

  async updateRepartition(id: number, payload: Record<string, unknown>): Promise<unknown> {
    return updateRow('param_repartitions', 'id_param_repartition', id, payload);
  },

  async findActiveRepartition(): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('param_repartitions')
      .select('*')
      .eq('taux_actif', true)
      .order('date_effet', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findMortalite(): Promise<unknown[]> {
    return listRows('mortalite', 'age_mort');
  },

  async findParametresGeneraux(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('parametres_generaux')
      .select('*')
      .order('code', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async updateParametreGeneral(id: number, payload: Record<string, unknown>): Promise<unknown> {
    return updateRow('parametres_generaux', 'id_parametre_generaux', id, payload);
  },

  async findParametreGeneralById(id: number): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('parametres_generaux')
      .select('*')
      .eq('id_parametre_generaux', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findParametreGeneralByCode(code: string): Promise<unknown | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('parametres_generaux')
      .select('*')
      .eq('code', code)
      .eq('actif', true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ?? null;
  },

  async findReference(kind: ReferenceKind): Promise<unknown[]> {
    const config = referenceConfigs[kind];
    return listRows(config.table, config.orderBy);
  },

  async createReference(kind: ReferenceKind, payload: Record<string, unknown>): Promise<unknown> {
    const config = referenceConfigs[kind];
    return insertRow(config.table, payload);
  },

  async updateReference(kind: ReferenceKind, id: number, payload: Record<string, unknown>): Promise<unknown> {
    const config = referenceConfigs[kind];
    return updateRow(config.table, config.idColumn, id, payload);
  },
};
