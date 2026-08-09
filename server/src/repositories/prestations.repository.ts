import { getSupabaseServer } from '../config/supabaseServer';
import { buildIlikeOrFilter } from '../utils/postgrestFilters';

export interface PrestationFilters {
  search?: string;
  type?: string;
  statut?: string;
}

export interface PrestationPayload {
  adherent_id: string;
  type_prestation: string;
  statut_prestation: string;
  date_demande: string;
  montant?: number;
}

export interface GenererEcheancesPayload {
  annee: number;
  trimestre: number;
  dateEcheance: string;
}

export const prestationsRepository = {
  async findAdherentDateSouscription(adherentId: string): Promise<string | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('adherents')
      .select('date_souscription')
      .eq('id_adherent', adherentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.date_souscription ? String(data.date_souscription) : null;
  },

  async findAdherentForRente(adherentId: string): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select('id_adherent, date_retraite, cotisation_annuelle, retraite, decede')
      .eq('id_adherent', adherentId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async findPrestations(filters?: PrestationFilters): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('v_prestations_details').select('*');

    if (filters?.type && filters.type !== 'TOUS') {
      query = query.eq('type_prestation', filters.type);
    }
    if (filters?.statut && filters.statut !== 'TOUS') {
      query = query.eq('statut_prestation', filters.statut);
    }
    if (filters?.search) {
      const orFilter = buildIlikeOrFilter(filters.search, ['matricule', 'nom', 'prenoms']);
      if (orFilter) query = query.or(orFilter);
    }

    const { data, error } = await query.order('date_demande', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      id: row.id_prestation,
      adherent_id: row.id_adherent,
      montant: row.montant_du,
    }));
  },

  async createPrestation(payload: PrestationPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { adherent_id, montant, ...reste } = payload;
    const { data, error } = await supabase
      .from('prestations')
      .insert([{
        ...reste,
        id_adherent: Number(adherent_id),
        montant_du: Number(montant ?? 0),
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      ...data,
      id: data.id_prestation,
      adherent_id: data.id_adherent,
      montant: data.montant_du,
    };
  },

  async findById(id: string): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_prestations_details')
      .select('*')
      .eq('id_prestation', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? {
      ...data,
      id: data.id_prestation,
      adherent_id: data.id_adherent,
      montant: data.montant_du,
    } : null;
  },

  async updateStatut(
    id: string,
    statut: string,
    dates: { date_validation?: string; date_paiement?: string },
  ): Promise<any> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('prestations')
      .update({ statut_prestation: statut, ...dates })
      .eq('id_prestation', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return {
      ...data,
      id: data.id_prestation,
      adherent_id: data.id_adherent,
      montant: data.montant_du,
    };
  },

  async findRentes(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rentes')
      .select(`
        id_rente,
        id_adherent,
        capital_initial,
        capital_restant,
        statut_rente,
        date_effet,
        date_retraite,
        cotisation_maladie_annuelle,
        montant_trimestriel,
        taux_couverture,
        organisme_beneficiaire,
        reference_aps,
        adherents (
          matricule,
          nom,
          prenoms
        )
      `);

    if (error) throw new Error(error.message);

    return (data ?? []).map((r: any) => ({
      id: r.id_rente,
      adherent_id: r.id_adherent,
      matricule: r.adherents?.matricule || 'Inconnu',
      nom: r.adherents?.nom || 'Inconnu',
      prenoms: r.adherents?.prenoms || 'Inconnu',
      capital_initial: r.capital_initial,
      capital_restant: r.capital_restant,
      statut_rente: r.statut_rente || 'ACTIVE',
      date_effet: r.date_effet,
      date_retraite: r.date_retraite,
      cotisation_maladie_annuelle: Number(r.cotisation_maladie_annuelle ?? 0),
      montant_trimestriel: Number(r.montant_trimestriel ?? 0),
      taux_couverture: Number(r.taux_couverture ?? 100),
      organisme_beneficiaire: r.organisme_beneficiaire || 'APS',
      reference_aps: r.reference_aps,
    }));
  },

  async findRenteVersements(renteId: string): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rente_versements')
      .select('*')
      .eq('id_rente', renteId)
      .order('annee', { ascending: false })
      .order('trimestre', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      id: row.id_rente_versement,
      rente_id: row.id_rente,
      montant_versement: Number(row.montant_a_payer ?? row.montant ?? 0),
    }));
  },

  async findEcheances(filters?: { annee?: number; trimestre?: number; statut?: string }): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase.from('rente_versements').select(`
      *, rentes!inner (
        id_adherent, organisme_beneficiaire,
        adherents!inner (matricule, nom, prenoms)
      )
    `);
    if (filters?.annee) query = query.eq('annee', filters.annee);
    if (filters?.trimestre) query = query.eq('trimestre', filters.trimestre);
    if (filters?.statut && filters.statut !== 'TOUS') query = query.eq('statut', filters.statut);
    const { data, error } = await query.order('date_echeance', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      id: row.id_rente_versement,
      rente_id: row.id_rente,
      adherent_id: row.rentes?.id_adherent,
      matricule: row.rentes?.adherents?.matricule,
      nom: row.rentes?.adherents?.nom,
      prenoms: row.rentes?.adherents?.prenoms,
      montant_versement: Number(row.montant_a_payer ?? row.montant ?? 0),
    }));
  },

  async findActiveRentes(): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rentes')
      .select('*')
      .eq('statut_rente', 'ACTIVE');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async createEcheances(rows: Record<string, unknown>[]): Promise<any[]> {
    if (rows.length === 0) return [];
    const supabase = getSupabaseServer();
    const created: any[] = [];
    for (const row of rows) {
      const { data: existing, error: readError } = await supabase
        .from('rente_versements')
        .select('id_rente_versement')
        .eq('id_rente', row.id_rente)
        .eq('annee', row.annee)
        .eq('trimestre', row.trimestre)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (existing) continue;
      const { data, error } = await supabase.from('rente_versements').insert([row]).select().single();
      if (error) throw new Error(error.message);
      created.push(data);
    }
    return created;
  },

  async createRenteFromPrestation(input: {
    prestationId: string; adherentId: string; dateEffet: string; dateRetraite: string;
    capitalInitial: number; cotisationAnnuelle: number; montantTrimestriel: number;
    tauxCouverture: number; tauxFraisGestion: number; versionCalcul: string;
  }): Promise<any> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from('rentes').insert([{
      id_prestation: Number(input.prestationId),
      id_adherent: Number(input.adherentId),
      date_effet: input.dateEffet,
      date_retraite: input.dateRetraite,
      capital_initial: input.capitalInitial,
      capital_restant: input.capitalInitial,
      cotisation_maladie_annuelle: input.cotisationAnnuelle,
      montant_trimestriel: input.montantTrimestriel,
      taux_couverture: input.tauxCouverture,
      taux_frais_gestion: input.tauxFraisGestion,
      organisme_beneficiaire: 'APS',
      statut_rente: 'ACTIVE',
      version_calcul: input.versionCalcul,
    }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateEcheanceStatut(id: string, statut: string, observation: string): Promise<any> {
    const supabase = getSupabaseServer();
    const patch: Record<string, unknown> = { statut, observation, updated_at: new Date().toISOString() };
    if (statut === 'VALIDEE') patch.date_validation = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('rente_versements')
      .update(patch)
      .eq('id_rente_versement', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async findEcheanceById(id: string): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rente_versements').select('*').eq('id_rente_versement', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async payerEcheance(id: string, paiement: {
    datePaiement: string; referencePaiement: string; modePaiement: string; pieceJustificative?: string;
  }): Promise<any> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.rpc('payer_echeance_aps', {
      p_id_versement: Number(id),
      p_date_paiement: paiement.datePaiement,
      p_reference_paiement: paiement.referencePaiement,
      p_mode_paiement: paiement.modePaiement,
      p_piece_justificative: paiement.pieceJustificative ?? null,
    });
    if (error) throw new Error(error.message);
    return data;
  },
};
