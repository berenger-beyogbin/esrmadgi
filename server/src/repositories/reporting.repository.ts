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

  async findPrecomptesAnnee(annee: number): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('precomptes')
      .select('matricule,periode,montant_depart,montant_retour,statut_precompte')
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

  async findAdherents(scope: 'TOUS' | 'ACTIFS' | 'RETRAITES'): Promise<any[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase
      .from('v_adherents_complets')
      .select(
        'id_adherent,matricule,nom,prenoms,grade,date_souscription,date_precompte,cotisation_es,date_retraite,capital_acquis,statut,decede,retraite',
      )
      .not('etat', 'in', '("EN_ATTENTE","REJETE")')
      .eq('decede', false);
    if (scope === 'ACTIFS') query = query.eq('retraite', false);
    if (scope === 'RETRAITES') query = query.eq('retraite', true);
    const { data, error } = await query.order('nom');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findPrecomptesParMatricules(matricules: string[]): Promise<any[]> {
    if (matricules.length === 0) return [];
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_precomptes_details')
      .select('matricule,annee,trimestre,statut_precompte')
      .in('matricule', matricules);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findRentesActives(): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rentes')
      .select('id_rente,id_adherent,capital_initial,capital_restant,statut_rente');
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findVersementsParRentes(idsRentes: number[]): Promise<any[]> {
    if (idsRentes.length === 0) return [];
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rente_versements')
      .select('id_rente,annee,trimestre,statut')
      .in('id_rente', idsRentes);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findRachatsResiliations(): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_rachats_details')
      .select(
        'id_rachat,matricule,nom,prenoms,date_demande,statut,capital_verse,penalite,montant_net,anciennete_annees',
      )
      .order('date_demande', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findPrestationsParType(types: string[]): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_prestations_details')
      .select(
        'id_prestation,id_adherent,matricule,nom,prenoms,type_prestation,statut_prestation,date_evenement,date_demande,date_paiement,montant_du,montant_paye',
      )
      .in('type_prestation', types)
      .order('date_demande', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findBeneficiairesParAdherents(idsAdherents: number[]): Promise<any[]> {
    if (idsAdherents.length === 0) return [];
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('beneficiaires')
      .select('id_adherent,nom_benef,prenoms_benef,lien,pourcentage')
      .in('id_adherent', idsAdherents);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findAdherentsParIds(idsAdherents: number[]): Promise<any[]> {
    if (idsAdherents.length === 0) return [];
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_adherents_complets')
      .select('id_adherent,matricule,nom,prenoms,grade,retraite')
      .in('id_adherent', idsAdherents);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findCotisationsPeriode(dateDebut: string, dateFin: string): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_cotisations_details')
      .select('id_adherent,matricule,nom,prenoms,montant,date_valeur,source')
      .eq('statut_detail', 'ENCAISSEE')
      .not('date_valeur', 'is', null)
      .gte('date_valeur', dateDebut)
      .lte('date_valeur', dateFin)
      .order('date_valeur', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findRachatsPeriode(dateDebut: string, dateFin: string): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_rachats_details')
      .select('id_rachat,matricule,nom,prenoms,statut,montant_net,date_paiement')
      .eq('statut', 'PAYE')
      .gte('date_paiement', dateDebut)
      .lte('date_paiement', dateFin);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findPrestationsPayeesPeriode(dateDebut: string, dateFin: string): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('v_prestations_details')
      .select('id_prestation,matricule,nom,prenoms,type_prestation,montant_paye,date_paiement')
      .eq('statut_prestation', 'PAYE')
      .not('date_paiement', 'is', null)
      .gte('date_paiement', dateDebut)
      .lte('date_paiement', dateFin);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findRenteVersementsPayes(dateDebut?: string, dateFin?: string): Promise<any[]> {
    const supabase = getSupabaseServer();
    let query: any = supabase
      .from('rente_versements')
      .select('id_rente,montant,montant_a_payer,statut,date_paiement');
    if (dateDebut) query = query.gte('date_paiement', dateDebut);
    if (dateFin) query = query.lte('date_paiement', dateFin);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findBeneficiairesTous(): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('beneficiaires')
      .select('id_beneficiaire,id_adherent,nom_benef,prenoms_benef,lien,pourcentage,statut,date_enreg')
      .order('date_enreg', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async findVersementsRentesPeriodeAvecAdherent(dateDebut: string, dateFin: string): Promise<any[]> {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('rente_versements')
      .select('id_rente,montant,montant_a_payer,statut,date_paiement,rentes!inner(id_adherent)')
      .eq('statut', 'PAYEE')
      .not('date_paiement', 'is', null)
      .gte('date_paiement', dateDebut)
      .lte('date_paiement', dateFin);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
