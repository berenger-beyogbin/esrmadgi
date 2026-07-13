import { getSupabaseServer } from '../config/supabaseServer';

export interface DashboardScope {
  matricule?: string | null;
}

export interface DashboardAdherentRow {
  statut?: boolean | string | null;
  decede?: boolean | null;
  retraite?: boolean | null;
  cotisation_es?: number | string | null;
  capital_acquis?: number | string | null;
  pm?: number | string | null;
}

export interface DashboardCotisationRow {
  nom?: string | null;
  prenoms?: string | null;
  matricule?: string | null;
  periode?: string | null;
  source?: string | null;
  montant?: number | string | null;
  date_valeur?: string | null;
}

export interface DashboardPrestationRow {
  nom?: string | null;
  prenoms?: string | null;
  type_prestation?: string | null;
  statut_prestation?: string | null;
  date_demande?: string | null;
  montant?: number | string | null;
}

function applyMatriculeScope(query: any, scope?: DashboardScope): any {
  if (scope?.matricule) {
    return query.eq('matricule', scope.matricule);
  }
  return query;
}

export const dashboardRepository = {
  async findAdherents(scope?: DashboardScope): Promise<DashboardAdherentRow[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase
      .from('v_adherents_complets')
      .select('statut, decede, retraite, cotisation_es, capital_acquis, pm, matricule');

    query = applyMatriculeScope(query, scope);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as DashboardAdherentRow[];
  },

  async findRecentCotisations(scope?: DashboardScope): Promise<DashboardCotisationRow[]> {
    try {
      const supabase = getSupabaseServer();
      let query: any = supabase
        .from('v_cotisations_details')
        .select('nom, prenoms, matricule, periode, source, montant, date_valeur')
        .not('date_valeur', 'is', null);

      query = applyMatriculeScope(query, scope);

      const { data, error } = await query.order('date_valeur', { ascending: false }).limit(5);
      if (error) throw new Error(error.message);
      return (data ?? []) as DashboardCotisationRow[];
    } catch (err) {
      console.error('[dashboard] recent cotisations:', err instanceof Error ? err.message : err);
      return [];
    }
  },

  async findRecentPrestations(scope?: DashboardScope): Promise<DashboardPrestationRow[]> {
    try {
      const supabase = getSupabaseServer();
      let query: any = supabase
        .from('v_prestations_details')
        .select('nom, prenoms, matricule, type_prestation, statut_prestation, date_demande, montant');

      query = applyMatriculeScope(query, scope);

      const { data, error } = await query.order('date_demande', { ascending: false }).limit(5);
      if (error) throw new Error(error.message);
      return (data ?? []) as DashboardPrestationRow[];
    } catch (err) {
      console.error('[dashboard] recent prestations:', err instanceof Error ? err.message : err);
      return [];
    }
  },

  async countPrestations(scope?: DashboardScope): Promise<number> {
    try {
      const supabase = getSupabaseServer();
      let query: any = supabase
        .from('v_prestations_details')
        .select('*', { count: 'exact', head: true });

      query = applyMatriculeScope(query, scope);

      const { count, error } = await query;
      if (error) throw new Error(error.message);
      return count ?? 0;
    } catch (err) {
      console.error('[dashboard] count prestations:', err instanceof Error ? err.message : err);
      return 0;
    }
  },
};
