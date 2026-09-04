import { getSupabaseServer } from '../config/supabaseServer';

export interface AdherentCandidatPromoRow {
  id_adherent: number;
  id_info_cotisation: number;
  matricule: string;
  nom: string;
  prenoms: string;
  grade: string;
  date_retraite: string;
  cotisation_es: number;
}

const CANDIDATS_SELECT =
  'id_adherent, id_info_cotisation, matricule, nom, prenoms, grade, date_retraite, cotisation_es';

export const promotionRetraiteExistantsRepository = {
  async findCandidats(): Promise<AdherentCandidatPromoRow[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select(CANDIDATS_SELECT)
      .eq('statut', true)
      .eq('decede', false)
      .eq('retraite', false)
      .is('taux_abattement_promo', null)
      .gt('cotisation_es', 0)
      .not('grade', 'is', null)
      .not('date_retraite', 'is', null)
      .not('id_info_cotisation', 'is', null);

    if (error) throw new Error(error.message);
    return (data ?? []) as AdherentCandidatPromoRow[];
  },

  async appliquerAbattement(
    idInfoCotisation: number,
    payload: {
      cotisation_es: number;
      cotisation_es_avant_abattement: number;
      taux_abattement_promo: number;
      palier_abattement_promo: number;
    },
  ): Promise<void> {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('info_cotisations')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id_info_cotisation', idInfoCotisation);

    if (error) throw new Error(error.message);
  },
};
