import { getSupabaseServer } from '../config/supabaseServer';

export interface PaiementPayload {
  adherent_id: string;
  date_paiement: string;
  montant_paiement: number;
  moyen: string;
  origine_paiement: string;
  observation_dgi: string;
  date_valeur: string;
}

export const paiementsRepository = {
  async findPaiements(): Promise<unknown[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('paiements')
      .select(`
        id,
        adherent_id,
        date_paiement,
        montant_paiement,
        moyen,
        origine_paiement,
        observation_dgi,
        date_valeur,
        adherents (
          matricule,
          nom,
          prenoms
        )
      `)
      .order('date_paiement', { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((p: any) => ({
      id: p.id,
      adherent_id: p.adherent_id,
      matricule: p.adherents?.matricule || 'Inconnu',
      nom_adherent: p.adherents?.nom || 'Inconnu',
      prenoms_adherent: p.adherents?.prenoms || 'Inconnu',
      date_paiement: p.date_paiement,
      montant_paiement: p.montant_paiement,
      moyen: p.moyen,
      origine_paiement: p.origine_paiement,
      observation_dgi: p.observation_dgi,
      date_valeur: p.date_valeur,
    }));
  },

  async createPaiement(payload: PaiementPayload): Promise<unknown> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('paiements')
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
