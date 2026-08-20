import React, { useEffect, useMemo, useState } from 'react';
import {
  CimaC20Report,
  exporterCimaC20,
  exporterTableauExcel,
  getActifsAJour,
  getActifsNonAJour,
  getAdherentsActifs,
  getAdherentsRetraites,
  getAdherentsRetraitesParStatut,
  getAgentsDecedes,
  getAgentsDecedesCapitalVerse,
  getAvisAnnuelEligibles,
  getAyantsDroit,
  getCapitalDecesInvalidite,
  getCapitalDecesInvaliditeAvantRetraite,
  getCapitalRenteAdherents,
  getCapitalRestantDuPeriode,
  getCapitalRestantDuRetraites,
  getCimaC20,
  getCotisationsPeriode,
  getListeAdherents,
  getMouvementsFlux,
  getProvisionsGlobales,
  getRachats,
  getRachatsResiliations,
  getResiliations,
  getRetraitesAJour,
  getRetraitesNonAJour,
} from '../services/reportingService';
import { compteEsrService } from '../services/compteEsrService';
import { formatDateFr, formatFCFA } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';
import { ChevronDown, Download, FileBarChart2, FileDown, Loader2, RefreshCw } from 'lucide-react';

const STATUT_STYLES: Record<string, string> = {
  A_JOUR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAS_A_JOUR: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SENS_STYLES: Record<string, string> = {
  ENTREE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SORTIE: 'bg-rose-50 text-rose-700 border-rose-200',
};

type EtatId =
  | 'ADHERENTS'
  | 'ADHERENTS_ACTIFS'
  | 'ADHERENTS_RETRAITES'
  | 'AYANTS_DROIT'
  | 'RACHATS'
  | 'RACHATS_SEULS'
  | 'RESILIATIONS_SEULES'
  | 'RETRAITES_A_JOUR'
  | 'RETRAITES_NON_A_JOUR'
  | 'ACTIFS_A_JOUR'
  | 'ACTIFS_NON_A_JOUR'
  | 'ADHERENTS_RETRAITES_STATUT'
  | 'AGENTS_DECEDES'
  | 'AGENTS_DECEDES_CAPITAL'
  | 'CIMA_C20'
  | 'COTISATIONS_PERIODE'
  | 'CAPITAL_RENTE'
  | 'CAPITAL_RESTANT_DU'
  | 'CAPITAL_RESTANT_DU_PERIODE'
  | 'CAPITAL_DECES'
  | 'CAPITAL_DECES_AVANT_RETRAITE'
  | 'PROVISIONS_GLOBALES'
  | 'MOUVEMENTS_FLUX'
  | 'AVIS_ANNUEL';

interface EtatDef {
  id: EtatId;
  label: string;
  categorie: 'Listes' | 'Montants' | 'Autres';
  disponible: boolean;
}

const ETATS: EtatDef[] = [
  { id: 'ADHERENTS', label: 'Liste globale des adhérents', categorie: 'Listes', disponible: true },
  { id: 'ADHERENTS_ACTIFS', label: 'Adhérents en activité', categorie: 'Listes', disponible: true },
  { id: 'ADHERENTS_RETRAITES', label: 'Adhérents retraités', categorie: 'Listes', disponible: true },
  { id: 'AYANTS_DROIT', label: 'Liste globale des bénéficiaires en cas de décès', categorie: 'Listes', disponible: true },
  { id: 'RACHATS', label: 'Liste des retraits (rachats et résiliations)', categorie: 'Listes', disponible: true },
  { id: 'RETRAITES_A_JOUR', label: 'Retraités à jour', categorie: 'Listes', disponible: true },
  { id: 'RETRAITES_NON_A_JOUR', label: 'Retraités non à jour', categorie: 'Listes', disponible: true },
  { id: 'ACTIFS_A_JOUR', label: 'Adhérents en activité à jour', categorie: 'Listes', disponible: true },
  { id: 'ACTIFS_NON_A_JOUR', label: 'Adhérents en activité pas à jour', categorie: 'Listes', disponible: true },
  { id: 'RACHATS_SEULS', label: 'Liste des rachats', categorie: 'Listes', disponible: true },
  { id: 'RESILIATIONS_SEULES', label: 'Liste des résiliations', categorie: 'Listes', disponible: true },
  { id: 'AGENTS_DECEDES', label: 'Liste des décédés', categorie: 'Listes', disponible: true },
  { id: 'ADHERENTS_RETRAITES_STATUT', label: 'Adhérents retraités par statut (vue combinée)', categorie: 'Listes', disponible: true },
  { id: 'AGENTS_DECEDES_CAPITAL', label: "Décès — capital versé aux bénéficiaires", categorie: 'Listes', disponible: true },
  { id: 'CIMA_C20', label: 'État CIMA C-20', categorie: 'Montants', disponible: true },
  { id: 'COTISATIONS_PERIODE', label: 'Cotisations encaissées sur une période', categorie: 'Montants', disponible: true },
  { id: 'CAPITAL_RENTE', label: 'Capital constitutif de rente par adhérent', categorie: 'Montants', disponible: true },
  { id: 'CAPITAL_RESTANT_DU', label: 'Capital restant dû par retraité (à date)', categorie: 'Montants', disponible: true },
  { id: 'CAPITAL_RESTANT_DU_PERIODE', label: 'Reversement du capital restant dû sur une période', categorie: 'Montants', disponible: true },
  { id: 'CAPITAL_DECES', label: 'Capital décès/invalidité par adhérent', categorie: 'Montants', disponible: true },
  { id: 'CAPITAL_DECES_AVANT_RETRAITE', label: 'Reversements décès/invalidité avant la retraite', categorie: 'Montants', disponible: true },
  { id: 'PROVISIONS_GLOBALES', label: 'Provisions globales & flux de rentes', categorie: 'Montants', disponible: true },
  { id: 'MOUVEMENTS_FLUX', label: 'Mouvements de flux (entrants/sortants)', categorie: 'Montants', disponible: true },
  { id: 'AVIS_ANNUEL', label: 'Avis annuel adhérents', categorie: 'Autres', disponible: true },
];

const CATEGORIES: EtatDef['categorie'][] = ['Listes', 'Montants', 'Autres'];
const ETATS_PERIODE: EtatId[] = ['COTISATIONS_PERIODE', 'MOUVEMENTS_FLUX', 'CAPITAL_RESTANT_DU_PERIODE'];

type Ligne = Record<string, unknown>;

interface ColonneVue {
  header: string;
  key: string;
  format?: 'money' | 'date';
  width?: number;
}

interface Metrique {
  label: string;
  valeur: number;
}

const COLONNES_RESUME: ColonneVue[] = [
  { header: 'Indicateur', key: 'label', width: 32 },
  { header: 'Montant', key: 'valeur', format: 'money', width: 22 },
];

function colonnesPour(id: EtatId): ColonneVue[] {
  switch (id) {
    case 'ADHERENTS':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Date de 1er précompte', key: 'datePremierPrecompte', format: 'date', width: 18 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Statut', key: 'statut', width: 14 },
      ];
    case 'ADHERENTS_ACTIFS':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Date de 1er précompte', key: 'datePremierPrecompte', format: 'date', width: 18 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
      ];
    case 'ADHERENTS_RETRAITES':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Date de départ retraite', key: 'dateDepartRetraite', format: 'date', width: 18 },
      ];
    case 'AYANTS_DROIT':
      return [
        { header: 'Matricule adhérent', key: 'matriculeAdherent', width: 16 },
        { header: 'Adhérent', key: 'nomPrenomsAdherent', width: 26 },
        { header: 'Bénéficiaire en cas de décès', key: 'nomPrenomsAyantDroit', width: 30 },
        { header: 'Lien', key: 'lien', width: 16 },
        { header: 'Pourcentage', key: 'pourcentage', width: 14 },
      ];
    case 'RETRAITES_A_JOUR':
    case 'RETRAITES_NON_A_JOUR':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Date de départ retraite', key: 'dateDepartRetraite', format: 'date', width: 18 },
      ];
    case 'ACTIFS_A_JOUR':
    case 'ACTIFS_NON_A_JOUR':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Date de 1er précompte', key: 'datePremierPrecompte', format: 'date', width: 18 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
      ];
    case 'RACHATS_SEULS':
    case 'RESILIATIONS_SEULES':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date de demande', key: 'dateDemande', format: 'date', width: 16 },
        { header: 'Statut', key: 'statut', width: 16 },
        { header: 'Capital versé', key: 'capitalVerse', format: 'money', width: 18 },
        { header: 'Pénalité', key: 'penalite', format: 'money', width: 16 },
        { header: 'Montant net', key: 'montantNet', format: 'money', width: 18 },
      ];
    case 'ADHERENTS_RETRAITES_STATUT':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Date de départ retraite', key: 'dateDepartRetraite', format: 'date', width: 18 },
        { header: 'Montant restant dû', key: 'montantRestantDu', format: 'money', width: 18 },
        { header: 'Statut', key: 'statut', width: 14 },
      ];
    case 'RACHATS':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date de demande', key: 'dateDemande', format: 'date', width: 16 },
        { header: 'Statut', key: 'statut', width: 16 },
        { header: 'Capital versé', key: 'capitalVerse', format: 'money', width: 18 },
        { header: 'Pénalité', key: 'penalite', format: 'money', width: 16 },
        { header: 'Montant net', key: 'montantNet', format: 'money', width: 18 },
      ];
    case 'AGENTS_DECEDES':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date événement', key: 'dateEvenement', format: 'date', width: 16 },
        { header: 'Date demande', key: 'dateDemande', format: 'date', width: 16 },
        { header: 'Statut dossier', key: 'statut', width: 16 },
        { header: 'Montant dû', key: 'montantDu', format: 'money', width: 18 },
        { header: 'Montant payé', key: 'montantPaye', format: 'money', width: 18 },
      ];
    case 'AGENTS_DECEDES_CAPITAL':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date événement', key: 'dateEvenement', format: 'date', width: 16 },
        { header: 'Date paiement', key: 'datePaiement', format: 'date', width: 16 },
        { header: 'Montant payé', key: 'montantPaye', format: 'money', width: 18 },
        { header: 'Bénéficiaires en cas de décès', key: 'ayantsDroit', width: 34 },
      ];
    case 'COTISATIONS_PERIODE':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Mouvements', key: 'nombreMouvements', width: 14 },
        { header: 'Montant encaissé', key: 'montantEncaisse', format: 'money', width: 20 },
      ];
    case 'CAPITAL_RENTE':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: 'Capital constitutif de rente', key: 'capitalConstitutifRente', format: 'money', width: 24 },
      ];
    case 'CAPITAL_RESTANT_DU':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: 'Capital initial', key: 'capitalInitial', format: 'money', width: 20 },
        { header: 'Montant restant dû', key: 'montantRestantDu', format: 'money', width: 20 },
      ];
    case 'CAPITAL_DECES':
    case 'CAPITAL_DECES_AVANT_RETRAITE':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Statut', key: 'statut', width: 16 },
        { header: 'Montant dû', key: 'montantDu', format: 'money', width: 18 },
        { header: 'Montant payé', key: 'montantPaye', format: 'money', width: 18 },
      ];
    case 'CAPITAL_RESTANT_DU_PERIODE':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Versements', key: 'nombreVersements', width: 14 },
        { header: 'Montant reversé', key: 'montantReverse', format: 'money', width: 20 },
      ];
    case 'MOUVEMENTS_FLUX':
      return [
        { header: 'Date', key: 'date', format: 'date', width: 14 },
        { header: 'Sens', key: 'sens', width: 12 },
        { header: 'Libellé', key: 'libelle', width: 24 },
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 26 },
        { header: 'Montant', key: 'montant', format: 'money', width: 18 },
      ];
    case 'AVIS_ANNUEL':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
      ];
    default:
      return [];
  }
}

interface DonneesEtat {
  lignes: Ligne[];
  resume: Metrique[] | null;
}

async function chargerDonnees(id: EtatId, periode: { dateDebut: string; dateFin: string }): Promise<DonneesEtat> {
  switch (id) {
    case 'ADHERENTS':
      return { lignes: (await getListeAdherents()) as unknown as Ligne[], resume: null };
    case 'ADHERENTS_ACTIFS':
      return { lignes: (await getAdherentsActifs()) as unknown as Ligne[], resume: null };
    case 'ADHERENTS_RETRAITES':
      return { lignes: (await getAdherentsRetraites()) as unknown as Ligne[], resume: null };
    case 'ADHERENTS_RETRAITES_STATUT':
      return { lignes: (await getAdherentsRetraitesParStatut()) as unknown as Ligne[], resume: null };
    case 'RACHATS':
      return { lignes: (await getRachatsResiliations()) as unknown as Ligne[], resume: null };
    case 'RACHATS_SEULS':
      return { lignes: (await getRachats()) as unknown as Ligne[], resume: null };
    case 'RESILIATIONS_SEULES':
      return { lignes: (await getResiliations()) as unknown as Ligne[], resume: null };
    case 'RETRAITES_A_JOUR':
      return { lignes: (await getRetraitesAJour()) as unknown as Ligne[], resume: null };
    case 'RETRAITES_NON_A_JOUR':
      return { lignes: (await getRetraitesNonAJour()) as unknown as Ligne[], resume: null };
    case 'ACTIFS_A_JOUR':
      return { lignes: (await getActifsAJour()) as unknown as Ligne[], resume: null };
    case 'ACTIFS_NON_A_JOUR':
      return { lignes: (await getActifsNonAJour()) as unknown as Ligne[], resume: null };
    case 'AYANTS_DROIT':
      return { lignes: (await getAyantsDroit()) as unknown as Ligne[], resume: null };
    case 'AGENTS_DECEDES':
      return { lignes: (await getAgentsDecedes()) as unknown as Ligne[], resume: null };
    case 'AGENTS_DECEDES_CAPITAL':
      return { lignes: (await getAgentsDecedesCapitalVerse()) as unknown as Ligne[], resume: null };
    case 'COTISATIONS_PERIODE': {
      const rapport = await getCotisationsPeriode(periode.dateDebut, periode.dateFin);
      return {
        lignes: rapport.lignes as unknown as Ligne[],
        resume: [{ label: 'Total encaissé sur la période', valeur: rapport.total }],
      };
    }
    case 'CAPITAL_RENTE': {
      const rapport = await getCapitalRenteAdherents();
      return {
        lignes: rapport.lignes as unknown as Ligne[],
        resume: [{ label: 'Total capital constitutif de rente', valeur: rapport.total }],
      };
    }
    case 'CAPITAL_RESTANT_DU': {
      const rapport = await getCapitalRestantDuRetraites();
      return {
        lignes: rapport.lignes as unknown as Ligne[],
        resume: [{ label: 'Total restant dû', valeur: rapport.total }],
      };
    }
    case 'CAPITAL_DECES': {
      const rapport = await getCapitalDecesInvalidite();
      return {
        lignes: rapport.lignes as unknown as Ligne[],
        resume: [
          { label: 'Total dû', valeur: rapport.totalDu },
          { label: 'Total payé', valeur: rapport.totalPaye },
        ],
      };
    }
    case 'CAPITAL_DECES_AVANT_RETRAITE': {
      const rapport = await getCapitalDecesInvaliditeAvantRetraite();
      return {
        lignes: rapport.lignes as unknown as Ligne[],
        resume: [
          { label: 'Total dû', valeur: rapport.totalDu },
          { label: 'Total payé', valeur: rapport.totalPaye },
        ],
      };
    }
    case 'CAPITAL_RESTANT_DU_PERIODE': {
      const rapport = await getCapitalRestantDuPeriode(periode.dateDebut, periode.dateFin);
      return {
        lignes: rapport.lignes as unknown as Ligne[],
        resume: [{ label: 'Total reversé sur la période', valeur: rapport.total }],
      };
    }
    case 'PROVISIONS_GLOBALES': {
      const rapport = await getProvisionsGlobales();
      return {
        lignes: [],
        resume: [
          { label: 'Provisions mathématiques', valeur: rapport.provisionsMathematiques },
          { label: 'Capital acquis total', valeur: rapport.capitalAcquisTotal },
          { label: 'Capital décès versé', valeur: rapport.capitalDecesVerse },
          { label: 'Capital invalidité versé', valeur: rapport.capitalInvaliditeVerse },
          { label: 'Flux de rentes versés', valeur: rapport.fluxRentesVerses },
        ],
      };
    }
    case 'MOUVEMENTS_FLUX': {
      const rapport = await getMouvementsFlux(periode.dateDebut, periode.dateFin);
      return {
        lignes: rapport.mouvements as unknown as Ligne[],
        resume: [
          { label: 'Entrées', valeur: rapport.entrees },
          { label: 'Sorties', valeur: rapport.sorties },
          { label: 'Solde net', valeur: rapport.solde },
        ],
      };
    }
    case 'AVIS_ANNUEL':
      return { lignes: (await getAvisAnnuelEligibles()) as unknown as Ligne[], resume: null };
    default:
      return { lignes: [], resume: null };
  }
}

function formaterCellule(valeur: unknown, format?: 'money' | 'date'): string {
  if (valeur === null || valeur === undefined || valeur === '') return '-';
  if (format === 'money') return formatFCFA(Number(valeur));
  if (format === 'date') return formatDateFr(String(valeur));
  return String(valeur);
}

function premierJourAnnee(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function aujourdHuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const GRILLE_RESUME_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-5',
};

function classeGrilleResume(nombre: number): string {
  return GRILLE_RESUME_CLASSES[Math.min(Math.max(nombre, 1), 5)] ?? 'grid-cols-2 md:grid-cols-4';
}

export default function Reporting() {
  const [etatActif, setEtatActif] = useState<EtatId>('ADHERENTS');
  const [categorieOuverte, setCategorieOuverte] = useState<EtatDef['categorie'] | null>('Listes');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [resume, setResume] = useState<Metrique[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [periode, setPeriode] = useState({ dateDebut: premierJourAnnee(), dateFin: aujourdHuiIso() });
  const [rapportCima, setRapportCima] = useState<CimaC20Report | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [telechargementEnCours, setTelechargementEnCours] = useState<string | null>(null);

  const definition = useMemo(() => ETATS.find((e) => e.id === etatActif), [etatActif]);
  const colonnes = useMemo(() => colonnesPour(etatActif), [etatActif]);
  const necessitePeriode = ETATS_PERIODE.includes(etatActif);
  const necessiteAnnee = etatActif === 'CIMA_C20' || etatActif === 'AVIS_ANNUEL';

  const chargerCima = async () => {
    setIsLoading(true);
    setErreur(null);
    try {
      const rapport = await getCimaC20(annee);
      setRapportCima(rapport);
    } catch (e: any) {
      setErreur(e?.message || "Erreur lors du chargement de l'état CIMA C-20.");
      setRapportCima(null);
    } finally {
      setIsLoading(false);
    }
  };

  const rafraichir = async () => {
    if (etatActif === 'CIMA_C20') {
      await chargerCima();
      return;
    }
    setIsLoading(true);
    setErreur(null);
    try {
      const donnees = await chargerDonnees(etatActif, periode);
      setLignes(donnees.lignes);
      setResume(donnees.resume);
    } catch (e: any) {
      setErreur(e?.message || "Erreur lors du chargement de l'état.");
      setLignes([]);
      setResume(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!definition?.disponible) return;
    setCategorieOuverte(definition.categorie);
    rafraichir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etatActif]);

  const handleExportExcel = async () => {
    if (!definition) return;
    setExportEnCours(true);
    try {
      if (etatActif === 'CIMA_C20') {
        await exporterCimaC20(annee);
        return;
      }
      const colonnesExport = colonnes.length > 0 ? colonnes : COLONNES_RESUME;
      const lignesExport = colonnes.length > 0 ? lignes : ((resume ?? []) as unknown as Ligne[]);
      await exporterTableauExcel({
        titre: definition.label.toUpperCase(),
        sousTitre: `Généré le ${formatDateFr(new Date().toISOString())}`,
        colonnes: colonnesExport.map((c) => ({ header: c.header, key: c.key, width: c.width, format: c.format })),
        lignes: lignesExport as unknown as Array<Record<string, unknown>>,
        fichier: `${definition.label.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`,
      });
    } catch (e: any) {
      setErreur(e?.message || "Erreur lors de l'export Excel.");
    } finally {
      setExportEnCours(false);
    }
  };

  const handleTelechargerAvisAnnuel = async (idAdherent: string, matricule: string) => {
    setTelechargementEnCours(idAdherent);
    setErreur(null);
    try {
      const { data, error } = await compteEsrService.telechargerAvisAnnuel(idAdherent, annee);
      if (error || !data) {
        throw error || new Error('Avis annuel indisponible.');
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `avis-annuel-esr-${matricule || idAdherent}-${annee}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErreur(e?.message || "Erreur lors du téléchargement de l'avis annuel.");
    } finally {
      setTelechargementEnCours(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-[#2b529f]" />
            Reporting ESR
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            États réglementaires et statistiques du module Épargne Santé Retraite.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2 self-start">
            {CATEGORIES.map((categorie) => (
              <div key={categorie} className="rounded-xl border border-slate-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCategorieOuverte((ouverte) => ouverte === categorie ? null : categorie)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition ${
                    categorieOuverte === categorie ? 'bg-slate-100 text-[#2b529f]' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-expanded={categorieOuverte === categorie}
                >
                  <span className="text-xs font-black uppercase tracking-wide">{categorie}</span>
                  <span className="flex items-center gap-2">
                    <span className="min-w-6 rounded-full bg-white border border-slate-200 px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-500">
                      {ETATS.filter((e) => e.categorie === categorie).length}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${categorieOuverte === categorie ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {categorieOuverte === categorie && (
                <div className="space-y-1 p-2 border-t border-slate-100">
                  {ETATS.filter((e) => e.categorie === categorie).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEtatActif(e.id)}
                      disabled={!e.disponible}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                        etatActif === e.id
                          ? 'bg-[#2b529f]/10 text-[#2b529f] border border-[#2b529f]/30'
                          : e.disponible
                            ? 'text-slate-600 hover:bg-slate-50'
                            : 'text-slate-350 cursor-not-allowed'
                      }`}
                    >
                      {e.label}
                      {!e.disponible && <span className="block text-[10px] text-slate-400">Prochainement</span>}
                    </button>
                  ))}
                </div>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-800">{definition?.label}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {necessiteAnnee && (
                  <input
                    type="number"
                    value={annee}
                    onChange={(e) => setAnnee(Number(e.target.value) || annee)}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                )}
                {necessitePeriode && (
                  <>
                    <input
                      type="date"
                      value={periode.dateDebut}
                      onChange={(e) => setPeriode((p) => ({ ...p, dateDebut: e.target.value }))}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                    <span className="text-slate-400 text-xs">au</span>
                    <input
                      type="date"
                      value={periode.dateFin}
                      onChange={(e) => setPeriode((p) => ({ ...p, dateFin: e.target.value }))}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </>
                )}
                <button
                  onClick={rafraichir}
                  disabled={isLoading || !definition?.disponible}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualiser
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportEnCours || !definition?.disponible || isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {exportEnCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Exporter Excel
                </button>
              </div>
            </div>

            {erreur && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">{erreur}</div>
            )}

            {!definition?.disponible ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-sm">
                  Cet état sera disponible dans un prochain lot de livraison.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#2b529f] animate-spin" />
                <span className="text-slate-500 text-xs font-medium">Chargement de l'état...</span>
              </div>
            ) : etatActif === 'CIMA_C20' ? (
              rapportCima && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ['Cotisations prévues', rapportCima.totaux.cotisationsPrevues],
                      ['Cotisations encaissées', rapportCima.totaux.cotisationsEncaissees],
                      ['Provisions mathématiques', rapportCima.totaux.provisionsMathematiques],
                      ['Prestations payées', rapportCima.totaux.prestationsPayees],
                    ].map(([label, valeur]) => (
                      <div key={label as string} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase">{label}</p>
                        <p className="text-lg font-bold text-slate-800 mt-1">{formatFCFA(valeur as number)}</p>
                      </div>
                    ))}
                  </div>
                  <ScrollableTableWrapper>
                    <table className="rtable min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">Période</th>
                          <th className="py-2.5 px-3">Adhérents</th>
                          <th className="py-2.5 px-3">Mouvements</th>
                          <th className="py-2.5 px-3">Cotisations prévues</th>
                          <th className="py-2.5 px-3">Cotisations encaissées</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rapportCima.trimestres.map((t) => (
                          <tr key={t.periode}>
                            <td data-label="Période" className="py-2.5 px-3 font-medium">{t.periode}</td>
                            <td data-label="Adhérents" className="py-2.5 px-3">{t.nombreAdherents}</td>
                            <td data-label="Mouvements" className="py-2.5 px-3">{t.nombreMouvements}</td>
                            <td data-label="Cotisations prévues" className="py-2.5 px-3">{formatFCFA(t.cotisationsPrevues)}</td>
                            <td data-label="Cotisations encaissées" className="py-2.5 px-3">{formatFCFA(t.cotisationsEncaissees)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollableTableWrapper>
                </div>
              )
            ) : (
              <div className="space-y-4">
                {resume && resume.length > 0 && (
                  <div className={`grid ${classeGrilleResume(resume.length)} gap-4`}>
                    {resume.map((m) => (
                      <div key={m.label} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase">{m.label}</p>
                        <p className="text-lg font-bold text-slate-800 mt-1">{formatFCFA(m.valeur)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {colonnes.length === 0 ? null : lignes.length === 0 ? (
                  <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-slate-400 text-sm">Aucune donnée pour cet état.</p>
                  </div>
                ) : (
                  <ScrollableTableWrapper>
                    <table className="rtable w-full table-fixed divide-y divide-slate-100 text-xs xl:text-sm">
                      <colgroup>
                        {colonnes.map((c) => (
                          <col key={c.key} style={{ width: `${c.width ?? 16}%` }} />
                        ))}
                        {etatActif === 'AVIS_ANNUEL' && <col style={{ width: '12%' }} />}
                      </colgroup>
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                          {colonnes.map((c) => (
                            <th key={c.key} className="py-2.5 px-2 xl:px-3 leading-tight break-words">
                              {c.header}
                            </th>
                          ))}
                          {etatActif === 'AVIS_ANNUEL' && (
                            <th className="py-2.5 px-2 xl:px-3">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lignes.map((ligne, index) => (
                          <tr key={`${(ligne as any).matricule ?? index}-${index}`} className="hover:bg-slate-50">
                            {colonnes.map((c) => {
                              const valeur = ligne[c.key];
                              if (c.key === 'statut' && typeof valeur === 'string' && STATUT_STYLES[valeur]) {
                                return (
                                  <td key={c.key} data-label={c.header} className="py-2.5 px-2 xl:px-3 whitespace-nowrap overflow-hidden">
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUT_STYLES[valeur]}`}>
                                      {valeur === 'A_JOUR' ? 'À jour' : 'Pas à jour'}
                                    </span>
                                  </td>
                                );
                              }
                              if (c.key === 'sens' && typeof valeur === 'string' && SENS_STYLES[valeur]) {
                                return (
                                  <td key={c.key} data-label={c.header} className="py-2.5 px-2 xl:px-3 whitespace-nowrap overflow-hidden">
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${SENS_STYLES[valeur]}`}>
                                      {valeur === 'ENTREE' ? 'Entrée' : 'Sortie'}
                                    </span>
                                  </td>
                                );
                              }
                              return (
                                <td key={c.key} data-label={c.header} className="py-2.5 px-2 xl:px-3 break-words overflow-hidden">
                                  {formaterCellule(valeur, c.format)}
                                </td>
                              );
                            })}
                            {etatActif === 'AVIS_ANNUEL' && (
                              <td data-label="Action" className="py-2.5 px-2 xl:px-3 whitespace-nowrap overflow-hidden">
                                <button
                                  onClick={() =>
                                    handleTelechargerAvisAnnuel(
                                      String((ligne as any).idAdherent),
                                      String((ligne as any).matricule ?? ''),
                                    )
                                  }
                                  disabled={telechargementEnCours === (ligne as any).idAdherent}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2b529f]/10 hover:bg-[#2b529f]/20 text-[#2b529f] text-xs font-semibold rounded-lg transition disabled:opacity-50"
                                >
                                  {telechargementEnCours === (ligne as any).idAdherent ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FileDown className="w-3.5 h-3.5" />
                                  )}
                                  PDF {annee}
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollableTableWrapper>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
