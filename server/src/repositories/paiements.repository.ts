import { getSupabaseServer } from '../config/supabaseServer';

export interface PaiementPayload {
  adherent_id: string;
  date_paiement: string;
  montant_paiement: number;
  moyen: string;
  origine_paiement: string;
  observation_dgi: string;
  date_valeur: string;
  numero_cheque?: string;
  banque_emettrice?: string;
  titulaire_cheque?: string;
  date_emission_cheque?: string;
  reference_bordereau?: string;
  id_precompte?: number;
}

export const paiementsRepository = {
  async findPaiements(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('paiements')
      .select(`
        id_paiement,
        id_adherent,
        date_paiement,
        montant_paiement,
        moyen,
        origine_paiement,
        observation_dgi,
        date_valeur,
        numero_cheque,
        banque_emettrice,
        titulaire_cheque,
        date_emission_cheque,
        reference_bordereau,
        date_depot_banque,
        reference_avis_credit,
        date_compensation,
        id_precompte,
        adherents (
          matricule,
          nom,
          prenoms
        )
      `)
      .order('date_paiement', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((p: any) => ({
      id: p.id_paiement,
      adherent_id: p.id_adherent,
      matricule: p.adherents?.matricule || 'Inconnu',
      nom_adherent: p.adherents?.nom || 'Inconnu',
      prenoms_adherent: p.adherents?.prenoms || 'Inconnu',
      date_paiement: p.date_paiement,
      montant_paiement: p.montant_paiement,
      moyen: p.moyen,
      origine_paiement: p.origine_paiement,
      observation_dgi: p.observation_dgi,
      date_valeur: p.date_valeur,
      numero_cheque: p.numero_cheque,
      banque_emettrice: p.banque_emettrice,
      titulaire_cheque: p.titulaire_cheque,
      date_emission_cheque: p.date_emission_cheque,
      reference_bordereau: p.reference_bordereau,
      date_depot_banque: p.date_depot_banque,
      reference_avis_credit: p.reference_avis_credit,
      date_compensation: p.date_compensation,
      id_precompte: p.id_precompte,
    }));
  },

  async createPaiement(payload: PaiementPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { adherent_id, ...reste } = payload;
    const { data, error } = await supabase
      .from('paiements')
      .insert([{ ...reste, id_adherent: Number(adherent_id) }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      ...data,
      id: data.id_paiement,
      adherent_id: data.id_adherent,
    };
  },

  async findById(id: string): Promise<any | null> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('paiements')
      .select('*')
      .eq('id_paiement', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { ...data, id: data.id_paiement, adherent_id: data.id_adherent } : null;
  },

  async updateChequeValidation(id: string, fields: Record<string, string | null>): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from('paiements').update(fields).eq('id_paiement', id);
    if (error) throw new Error(error.message);
  },
};
