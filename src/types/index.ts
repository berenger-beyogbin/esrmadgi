// Types file for MADGI ESR

export type UserProfile = 'ADHERENT' | 'GESTIONNAIRE' | 'ADMINISTRATEUR' | 'SUPERADMIN';

export interface DBUser {
  id: string;
  auth_user_id?: string;
  matricule: string;
  email: string;
  nom: string;
  prenoms: string;
  role: UserProfile;
  profil?: string;
  profil_code?: string;
  permissions?: string[];
  id_adherent?: string | null;
  user_actif?: boolean;
  must_change_password?: boolean;
}

export interface Civilite {
  id_civilite: number;
  libelle_civilite: string;
  sexe?: string | null;
  actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SituationMatrimoniale {
  id_situation_matrimoniale: number;
  libelle_situation: string;
  actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Emploi {
  id_emploi: number;
  libelle_emploi: string;
  actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Fonction {
  id_fonction: number;
  libelle_fonction: string;
  actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Grade {
  id_grade: number;
  libelle_grade: string;
  age_retraite: number;
  cotisation_annuelle: number;
  actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LienBeneficiaire {
  id_lien_beneficiaire: number;
  libelle_lien: string;
  actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Adherent {
  id: string;
  numero_police?: string;
  date_souscription: string;
  matricule: string;
  civilite: string; // From civilites
  nom: string;
  prenoms: string;
  date_naissance: string;
  lieu_naissance: string;
  situation_matrimoniale: string; // From situations_matrimoniales
  telephone: string;
  email: string;
  adresse_geographique: string;
  adresse_postale: string;
  direction: string;
  emploi: string; // From emplois
  statut: 'ACTIF' | 'RETRAITE' | 'DECEDE' | 'INACTIF' | string;
  grade_id: string;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  date_precompte: string;
  nb_trimestre: number;
  cotisation_es: number;
}

// Complete Adherent view representation
export interface VAdherentComplet {
  id: string;
  id_adherent?: number; // champ bigint réel utilisé comme FK dans beneficiaires
  numero_police: string;
  date_souscription: string;
  matricule: string;
  civilite: string;
  nom: string;
  prenoms: string;
  date_naissance: string;
  lieu_naissance: string;
  situation_matrimoniale: string;
  telephone: string;
  email: string;
  adresse_geographique: string;
  adresse_postale: string;
  direction: string;
  emploi: string;
  statut: boolean | string;
  decede?: boolean;
  retraite?: boolean;
  grade_id: string;
  grade_code: string;
  grade_libelle: string | null;
  date_effet: string;
  date_retraite: string;
  age_retraite: number;
  cotisation_annuelle: number;
  date_precompte: string | null;
  nb_trimestre: number;
  cotisation_es: number;
  cotisation_es_avant_abattement?: number | null;
  taux_abattement_promo?: number | null;
  palier_abattement_promo?: number | null;
}

export interface AdherentEligiblePromo {
  id_adherent: number;
  id_info_cotisation: number;
  matricule: string;
  nom: string;
  prenoms: string;
  grade: string;
  date_retraite: string;
  nb_trimestre_restant: number;
  palier_abattement_promo: number;
  taux_abattement_promo: number;
  cotisation_es_avant_abattement: number;
  cotisation_es_apres_abattement: number;
}

export interface AdherentFilterOptions {
  directions: string[];
  categories: string[];
  trimestresPremierPrecompte: string[];
}

export interface Beneficiaire {
  id_beneficiaire: number;
  id_adherent: number;
  nom_benef: string;
  prenoms_benef: string;
  contact?: string | null;
  lien: string;
  pourcentage: number;
  statut?: boolean | null;
  date_enreg?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface VCompteEsrDetails {
  id: string;
  id_compte_esr?: number;
  adherent_id: string;
  id_adherent?: number;
  matricule: string;
  nom: string;
  prenoms: string;
  capital_acquis: number;
  capital_constitutif?: number | null;
  pm: number;
  pp: number;
  pu: number;
  valeur_rachat: number;
  date_calcul: string;
  version_calc: string;
}

export interface VCotisationDetails {
  id: string;
  id_cotisation_detail?: number;
  adherent_id?: string;
  id_adherent?: string;
  matricule: string;
  nom: string;
  prenoms: string;
  periode: string;
  montant: number;
  statut: 'VALIDE' | 'EN_COURS' | 'REJETE' | string;
  statut_detail?: 'VALIDE' | 'EN_COURS' | 'REJETE' | string;
  statut_entete?: string;
  source: 'PRECOMPTE' | 'DIRECT' | string;
  mode?: string;
  periode_deb?: string;
  periode_fin?: string;
  date_cotisation?: string;
  date_valeur?: string;
}

export interface VPrecompteDetails {
  id_precompte: number;
  matricule: string;
  id_adherent: number;
  telephone?: string | null;
  nom: string;
  prenoms: string;
  periode: string;
  annee: number;
  trimestre: number;
  montant_depart: number;
  montant_cotisation_brut?: number;
  montant_credit_spontane?: number;
  montant_retour: number;
  statut_precompte: 'GENERE' | 'INITIE' | 'ENCAISSE' | 'PARTIEL' | 'REJETE' | string;
  date_generation: string | null;
  date_retour: string | null;
  id_cotisation_detail: number | null;
}

export interface GeneratePrecomptesResult {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface PeriodeMetier {
  periode: string;
  annee: number;
  trimestre: number;
  statut: 'OUVERTE' | 'CLOTUREE';
  date_cloture: string | null;
  cloture_par: string | null;
  date_ouverture?: string | null;
  date_cloture_prevue?: string | null;
}

export interface ControleCloturePeriode {
  periode: string;
  statut: 'OUVERTE' | 'CLOTUREE';
  dateCloturePrevue: string;
  synthese: {
    adherentsConcernes: number;
    precomptesAttendus: number;
    precomptesEncaisses: number;
    precomptesRegularises: number;
    paiementsSpontanes: number;
  };
  controles: {
    cotisationsToutesEncaissees: boolean;
    paiementsAvecDateValeur: boolean;
    precomptesTousTraites: boolean;
  };
  clotureAutorisee: boolean;
  infrastructurePrete: boolean;
  alertes: string[];
}

export interface VPrestationDetails {
  id: string;
  adherent_id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  type_prestation: 'RETRAITE' | 'DECES' | 'INVALIDITE' | 'RACHAT';
  statut_prestation: 'DOSSIER_OUVERT' | 'EN_CONTROLE' | 'VALIDE' | 'PAYE' | 'ANNULE';
  date_demande: string;
  montant: number;
  date_calcul?: string;
}

export interface Paiement {
  id: string;
  adherent_id: string;
  matricule?: string;
  nom_adherent?: string;
  prenoms_adherent?: string;
  date_paiement: string;
  montant_paiement: number;
  moyen: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | string;
  origine_paiement: string;
  observation_dgi: string;
  date_valeur: string;
  numero_cheque?: string;
  banque_emettrice?: string;
  titulaire_cheque?: string;
  date_emission_cheque?: string;
  reference_bordereau?: string;
  date_depot_banque?: string;
  reference_avis_credit?: string;
  date_compensation?: string;
  id_precompte?: number;
  statut_workflow?: 'SAISI' | 'CONTROLE' | 'DEPOSE_BANQUE' | 'COMPENSE' | 'VALIDE' | 'REJETE' | 'REJETE_BANQUE' | 'ENCAISSE';
}

export interface RenreDetails {
  id: string;
  adherent_id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  capital_initial: number;
  capital_restant: number;
  statut_rente: 'ACTIVE' | 'SUSPENDUE' | 'EXTINTE' | string;
  date_effet?: string;
  date_retraite?: string;
  cotisation_maladie_annuelle?: number;
  montant_trimestriel?: number;
  taux_couverture?: number;
  organisme_beneficiaire?: string;
  reference_aps?: string | null;
}

export interface RenteVersement {
  id: string;
  rente_id: string;
  date_versement: string;
  montant_versement: number;
  annee?: number;
  trimestre?: number;
  periode?: string;
  date_echeance?: string;
  statut?: EcheanceApsStatut;
  reference_paiement?: string | null;
  capital_avant?: number | null;
  capital_apres?: number | null;
}

export type EcheanceApsStatut =
  | 'GENEREE' | 'EN_CONTROLE' | 'VALIDEE' | 'PAYEE'
  | 'REJETEE' | 'SUSPENDUE' | 'ANNULEE';

export interface EcheanceAps extends RenteVersement {
  adherent_id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  organisme_beneficiaire: string;
  montant_brut?: number;
  montant_a_payer?: number;
  observation?: string | null;
}

export interface ParametreVersion {
  id: string;
  code: string;
  nom: string;
  valeur: string;
  date_debut: string;
  date_fin?: string;
  actif: boolean;
}

export interface ParamRepartition {
  id_param_repartition: number;
  date_effet: string;
  taux_sante: number | null;
  taux_retraite: number | null;
  taux_actif?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Mortalite {
  age_mort: number;
  lx: number;
  dx: number;
  qx: number;
}

export interface ParametreGeneral {
  id_parametre_generaux: number;
  code: string | null;
  libelle: string;
  valeur: string | null;
  chemin_dossier?: string | null;
  description?: string | null;
  actif?: boolean | null;
  date_debut?: string | null;
  date_fin?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuditLog {
  id: string;
  id_audit?: number;
  action: string;
  utilisateur: string;
  objet_audit: string;
  id_objet?: string | null;
  date: string;
  details: string;
}

export interface UtilisateurAcces {
  id: string;
  id_utilisateur: number;
  auth_user_id: string | null;
  matricule: string;
  email: string;
  telephone: string | null;
  user_actif: boolean;
  profil: string;
  role: UserProfile;
  id_adherent: string | null;
  date_creation: string | null;
  date_modif: string | null;
  email_confirme: boolean;
  derniere_connexion: string | null;
}

export interface VDashboardGlobal {
  actifs: number;
  inactifs: number;
  retraites: number;
  decedes: number;
  total_capital_acquis: number;
  total_pm: number;
  total_valeur_rachat: number;
}

export interface DerniereCotisation {
  date: string | null;
  montant: number;
  adherent: string;
  matricule: string;
  periode: string;
  source: string;
}

export interface DernierePrestation {
  date: string | null;
  adherent: string;
  type: string;
  statut: string;
  montant: number;
}

export interface DashboardStats {
  totalAdherentsActifs: number;
  cotisationTrimestrielleTotale: number;
  provisionTotale: number;
  provisionPeriode: string | null;
  provisionDateArrete: string | null;
  provisionDisponible: boolean;
  capitalAcquisTotal: number;
  nombrePrestations: number;
  repartition: {
    actif: number;
    retraite: number;
    decede: number;
    autre: number;
  };
  totalPm: number;
  dernieresCotisations: DerniereCotisation[];
  dernieresPrestations: DernierePrestation[];
}

export interface InfoCotisation {
  id: string;
  id_adherent: string;
  cotisation_es: number;
  info_actif: boolean;
}

export interface CotisationSpontaneePayload {
  id_adherent: string;
  matricule: string;
  mode: string;
  date: string;
  montant: number;
  id_precompte?: number;
  numero_cheque?: string;
  banque_emettrice?: string;
  titulaire_cheque?: string;
  date_emission_cheque?: string;
}

export interface ExternalAgentInfo {
  matricule: string;
  nom: string;
  prenoms: string;
  date_naissance?: string | null;
  telephone?: string | null;
  email?: string | null;
  direction?: string | null;
  emploi?: string | null;
  grade?: string | null;
  civilite?: string | null;
  situation_matrimoniale?: string | null;
  source: 'MYSQL' | 'SIAPS';
  found: boolean;
  raw?: unknown;
}

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
  cotisation_es_avant_abattement?: number | null;
  taux_abattement_promo?: number | null;
  palier_abattement_promo?: number | null;
  taux_gar?: number | null;
  frais_rente?: number | null;
  taux_rachat?: number | null;
}

export interface OnlineAdhesion extends OnlineAdhesionPayload {
  id: string;
  id_adherent: number;
  statut: boolean | string;
  etat: string;
  statut_demande: OnlineAdhesionStatus;
  adhesion_en_ligne: boolean;
  commercial_id?: number | null;
  commercial_matricule?: string | null;
  source_adhesion?: 'EN_LIGNE' | 'COMMERCIAL' | 'BACKOFFICE';
  grade_code?: string;
  grade_libelle?: string | null;
  id_info_cotisation?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FirstLoginCredentials {
  login: string;
  email: string;
  temporary_password?: string;
  must_change_password: boolean;
  access_preserved?: boolean;
  profil?: string;
}

export interface OnlineAdhesionValidationResult extends OnlineAdhesion {
  first_login?: FirstLoginCredentials;
}

export interface CommercialActivityRow {
  id_utilisateur: number;
  matricule: string;
  email: string;
  actif: boolean;
  total: number;
  en_attente: number;
  valides: number;
  rejetes: number;
  taux_conversion: number;
  derniere_activite: string | null;
  dossiers: CommercialAdhesionSummary[];
}

export interface CommercialAdhesionSummary {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  statut_demande: OnlineAdhesionStatus;
  created_at: string | null;
}

export interface CommercialActivity {
  synthese: {
    commerciaux: number;
    commerciaux_actifs: number;
    dossiers: number;
    en_attente: number;
    valides: number;
    rejetes: number;
    taux_conversion: number;
  };
  commerciaux: CommercialActivityRow[];
}

export interface OnlineAdhesionReferentiels {
  civilites: Civilite[];
  situations_matrimoniales: SituationMatrimoniale[];
  emplois: Emploi[];
  grades: Grade[];
  mortalite: Mortalite[];
  parametres_calcul: {
    tauxAnnuel: number | null;
    fraisRente: number | null;
    ageMax: number | null;
  };
  promo_abattement_retraite: {
    actif: boolean;
    dateDebut: string | null;
    dateFin: string | null;
  } | null;
}
