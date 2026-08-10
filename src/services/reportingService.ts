import { apiGet } from '../lib/apiClient';

export interface AdherentReportRow {
  matricule: string;
  nomPrenoms: string;
  grade: string;
  dateAdhesion: string | null;
  datePremierPrecompte?: string | null;
  primeTrimestrielle: number;
  dateDepartRetraite?: string | null;
  montantRestantDu?: number;
  statut?: string;
}

export interface RachatReportRow {
  matricule: string;
  nomPrenoms: string;
  dateDemande: string | null;
  statut: string;
  capitalVerse: number;
  penalite: number;
  montantNet: number;
}

export interface AgentDecedeReportRow {
  matricule: string;
  nomPrenoms: string;
  dateEvenement: string | null;
  dateDemande?: string | null;
  datePaiement?: string | null;
  statut?: string;
  montantDu?: number;
  montantPaye: number;
  ayantsDroit?: string;
}

export interface CotisationsPeriodeReport {
  dateDebut: string;
  dateFin: string;
  total: number;
  lignes: Array<{ matricule: string; nomPrenoms: string; nombreMouvements: number; montantEncaisse: number }>;
}

export interface CapitalRenteReport {
  total: number;
  lignes: Array<{ matricule: string; nomPrenoms: string; grade: string; capitalConstitutifRente: number }>;
}

export interface CapitalRestantDuReport {
  total: number;
  lignes: Array<{ matricule: string; nomPrenoms: string; grade: string; capitalInitial: number; montantRestantDu: number }>;
}

export interface CapitalDecesInvaliditeReport {
  totalDu: number;
  totalPaye: number;
  lignes: Array<{
    matricule: string;
    nomPrenoms: string;
    type: string;
    statut: string;
    montantDu: number;
    montantPaye: number;
  }>;
}

export interface ProvisionsGlobalesReport {
  genereLe: string;
  provisionsMathematiques: number;
  capitalAcquisTotal: number;
  capitalDecesVerse: number;
  capitalInvaliditeVerse: number;
  fluxRentesVerses: number;
  nombreComptes: number;
}

export interface MouvementsFluxReport {
  dateDebut: string;
  dateFin: string;
  entrees: number;
  sorties: number;
  solde: number;
  mouvements: Array<{
    date: string | null;
    sens: 'ENTREE' | 'SORTIE';
    libelle: string;
    matricule: string;
    nomPrenoms: string;
    montant: number;
  }>;
}

export interface CimaC20Report {
  etat: string;
  annee: number;
  genereLe: string;
  trimestres: Array<{
    periode: string;
    nombreAdherents: number;
    cotisationsPrevues: number;
    cotisationsEncaissees: number;
    nombreMouvements: number;
  }>;
  totaux: {
    cotisationsPrevues: number;
    cotisationsEncaissees: number;
    nombreMouvements: number;
    capitalAcquis: number;
    provisionsMathematiques: number;
    valeurRachat: number;
    prestationsPayees: number;
  };
  controles: {
    ecartCotisations: number;
    comptesAvecProvision: number;
    nombreComptes: number;
  };
}

type ApiResponse<T> = { data: T; error: string | null };

export async function getCimaC20(annee: number): Promise<CimaC20Report> {
  const { data, error } = await apiGet<ApiResponse<CimaC20Report>>(
    `/api/reporting/cima-c20?annee=${encodeURIComponent(String(annee))}`,
  );
  if (error) throw new Error(error);
  if (data?.error) throw new Error(data.error);
  if (!data?.data) throw new Error('État CIMA indisponible.');
  return data.data;
}

export async function exporterCimaC20(annee: number): Promise<void> {
  const report = await getCimaC20(annee);
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('CIMA C-20');
  sheet.addRow(['MADGI - ÉPARGNE SANTÉ RETRAITE']);
  sheet.addRow([`ÉTAT CIMA C-20 - EXERCICE ${annee}`]);
  sheet.addRow([]);
  sheet.addRow(['Période', 'Nombre adhérents', 'Mouvements', 'Cotisations prévues', 'Cotisations encaissées', 'Écart']);
  report.trimestres.forEach((row) => {
    sheet.addRow([
      row.periode,
      row.nombreAdherents,
      row.nombreMouvements,
      row.cotisationsPrevues,
      row.cotisationsEncaissees,
      row.cotisationsPrevues - row.cotisationsEncaissees,
    ]);
  });
  sheet.addRow([
    'TOTAL',
    '',
    report.totaux.nombreMouvements,
    report.totaux.cotisationsPrevues,
    report.totaux.cotisationsEncaissees,
    report.controles.ecartCotisations,
  ]);
  sheet.addRow([]);
  sheet.addRow(['Capital acquis', report.totaux.capitalAcquis]);
  sheet.addRow(['Provisions mathématiques', report.totaux.provisionsMathematiques]);
  sheet.addRow(['Valeur de rachat', report.totaux.valeurRachat]);
  sheet.addRow(['Prestations payées', report.totaux.prestationsPayees]);
  sheet.mergeCells('A1:F1');
  sheet.mergeCells('A2:F2');
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF17365D' } };
  sheet.getRow(2).font = { bold: true, size: 13 };
  sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
  sheet.getRow(9).font = { bold: true };
  sheet.columns = [
    { width: 18 }, { width: 18 }, { width: 14 },
    { width: 22 }, { width: 24 }, { width: 18 },
  ];
  ['D', 'E', 'F'].forEach((column) => {
    sheet.getColumn(column).numFmt = '#,##0';
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CIMA_C20_ESR_${annee}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

async function fetchReport<T>(path: string): Promise<T[]> {
  const { data, error } = await apiGet<ApiResponse<T[]>>(`/api/reporting/${path}`);
  if (error) throw new Error(error);
  if (data?.error) throw new Error(data.error);
  return data?.data ?? [];
}

export const getListeAdherents = () => fetchReport<AdherentReportRow>('adherents');
export const getAdherentsActifs = () => fetchReport<AdherentReportRow>('adherents-actifs');
export const getAdherentsRetraites = () => fetchReport<AdherentReportRow>('adherents-retraites');
export const getAdherentsRetraitesParStatut = () => fetchReport<AdherentReportRow>('adherents-retraites-statut');
export const getRachatsResiliations = () => fetchReport<RachatReportRow>('rachats-resiliations');
export const getAgentsDecedes = () => fetchReport<AgentDecedeReportRow>('agents-decedes');
export const getAgentsDecedesCapitalVerse = () => fetchReport<AgentDecedeReportRow>('agents-decedes-capital-verse');

async function fetchObjet<T>(path: string): Promise<T> {
  const { data, error } = await apiGet<ApiResponse<T>>(`/api/reporting/${path}`);
  if (error) throw new Error(error);
  if (data?.error) throw new Error(data.error);
  if (!data?.data) throw new Error('État indisponible.');
  return data.data;
}

export const getCotisationsPeriode = (dateDebut: string, dateFin: string) =>
  fetchObjet<CotisationsPeriodeReport>(
    `cotisations-periode?dateDebut=${encodeURIComponent(dateDebut)}&dateFin=${encodeURIComponent(dateFin)}`,
  );
export const getCapitalRenteAdherents = () => fetchObjet<CapitalRenteReport>('capital-rente-adherents');
export const getCapitalRestantDuRetraites = () => fetchObjet<CapitalRestantDuReport>('capital-restant-du-retraites');
export const getCapitalDecesInvalidite = () => fetchObjet<CapitalDecesInvaliditeReport>('capital-deces-invalidite');
export const getProvisionsGlobales = () => fetchObjet<ProvisionsGlobalesReport>('provisions-globales');
export const getMouvementsFlux = (dateDebut: string, dateFin: string) =>
  fetchObjet<MouvementsFluxReport>(
    `mouvements-flux?dateDebut=${encodeURIComponent(dateDebut)}&dateFin=${encodeURIComponent(dateFin)}`,
  );

interface ColonneExport {
  header: string;
  key: string;
  width?: number;
  format?: 'money' | 'date';
}

export async function exporterTableauExcel(params: {
  titre: string;
  sousTitre: string;
  colonnes: ColonneExport[];
  lignes: Array<Record<string, unknown>>;
  fichier: string;
}): Promise<void> {
  const { titre, sousTitre, colonnes, lignes, fichier } = params;
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('État');
  sheet.addRow(['MADGI - ÉPARGNE SANTÉ RETRAITE']);
  sheet.addRow([titre]);
  sheet.addRow([sousTitre]);
  sheet.addRow([]);
  sheet.addRow(colonnes.map((c) => c.header));
  lignes.forEach((ligne) => {
    sheet.addRow(colonnes.map((c) => (ligne[c.key] ?? '') as CellValueLike));
  });
  const lastCol = String.fromCharCode(65 + colonnes.length - 1);
  sheet.mergeCells(`A1:${lastCol}1`);
  sheet.mergeCells(`A2:${lastCol}2`);
  sheet.mergeCells(`A3:${lastCol}3`);
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF17365D' } };
  sheet.getRow(2).font = { bold: true, size: 13 };
  sheet.getRow(3).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
  sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
  sheet.columns = colonnes.map((c) => ({ width: c.width ?? 20 }));
  colonnes.forEach((c, index) => {
    if (c.format === 'money') sheet.getColumn(index + 1).numFmt = '#,##0';
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fichier;
  link.click();
  URL.revokeObjectURL(url);
}

type CellValueLike = string | number | null;
