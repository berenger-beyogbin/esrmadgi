import { apiGet } from '../lib/apiClient';

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
