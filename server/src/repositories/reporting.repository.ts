import { getSupabaseServer } from '../config/supabaseServer';

export const reportingRepository = {
  async findCotisationsAnnee(annee: number): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_cotisations_details')
      .select('id_adherent,periode,montant,source,statut_detail')
      .like('periode', `${annee}T%`);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findComptes(): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('comptes_esr')
      .select('id_adherent,capital_acquis,pm,valeur_rachat,date_calcul,version_calc');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findPrestationsAnnee(annee: number): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('prestations')
      .select('type_prestation,montant_du,montant_paye,statut_prestation,date_demande')
      .gte('date_demande', `${annee}-01-01`)
      .lte('date_demande', `${annee}-12-31`);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
