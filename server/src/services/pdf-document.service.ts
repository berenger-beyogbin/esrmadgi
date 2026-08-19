import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('fr-FR').replace(/\s/g, ' ')} FCFA`;
}

function safe(value: unknown): string {
  return String(value ?? '').trim();
}

function formatDateFr(value: unknown): string {
  const raw = safe(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
}

export async function genererRecuPaiementPdf(input: {
  numero: string;
  nom: string;
  prenoms: string;
  matricule: string;
  montant: number;
  datePaiement: string;
  dateValeur: string;
  moyen: string;
  origine: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.08, 0.2, 0.38);
  const green = rgb(0.08, 0.45, 0.28);

  page.drawText("REPUBLIQUE DE COTE D'IVOIRE", { x: 190, y: 790, size: 12, font: bold, color: blue });
  page.drawText('Union - Discipline - Travail', { x: 220, y: 772, size: 9, font: regular });
  page.drawText('MADGI - SERVICE EPARGNE SANTE RETRAITE', { x: 145, y: 735, size: 13, font: bold, color: blue });
  page.drawLine({ start: { x: 70, y: 715 }, end: { x: 525, y: 715 }, thickness: 1.5, color: blue });
  page.drawText('RECU DE VERSEMENT', { x: 200, y: 670, size: 19, font: bold, color: green });
  page.drawText(`N° ${safe(input.numero)}`, { x: 405, y: 642, size: 10, font: bold });

  const rows: Array<[string, string]> = [
    ['Nom et prenoms', `${safe(input.nom)} ${safe(input.prenoms)}`],
    ['Matricule', safe(input.matricule)],
    ['Montant', formatMoney(input.montant)],
    ['Date du paiement', formatDateFr(input.datePaiement)],
    ['Date de valeur', formatDateFr(input.dateValeur)],
    ['Moyen de paiement', safe(input.moyen)],
    ['Origine / reference', safe(input.origine)],
  ];
  let y = 590;
  for (const [label, value] of rows) {
    page.drawRectangle({
      x: 80, y: y - 8, width: 435, height: 34,
      borderWidth: 0.6, borderColor: rgb(0.78, 0.82, 0.86),
      color: y % 2 === 0 ? rgb(0.97, 0.98, 0.99) : rgb(1, 1, 1),
    });
    page.drawText(label, { x: 92, y: y + 4, size: 9, font: bold, color: blue });
    page.drawText(value.slice(0, 65), { x: 235, y: y + 4, size: 10, font: regular });
    y -= 42;
  }

  page.drawText('Le présent reçu atteste un paiement encaissé et porté au compte ESR.', {
    x: 110, y: 245, size: 9, font: regular, color: rgb(0.3, 0.34, 0.38),
  });
  page.drawText('LE SERVICE ESR', { x: 390, y: 175, size: 10, font: bold, color: blue });
  page.drawText(`Document généré le ${formatDateFr(new Date().toISOString())}`, {
    x: 80, y: 65, size: 8, font: regular, color: rgb(0.45, 0.48, 0.52),
  });
  return pdf.save();
}

export async function genererLiquidationPdf(input: {
  numero: string;
  type: string;
  nom: string;
  prenoms: string;
  matricule: string;
  dateDemande: string;
  montant: number;
  statut: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.08, 0.2, 0.38);

  page.drawText('MADGI - EPARGNE SANTE RETRAITE', { x: 165, y: 780, size: 15, font: bold, color: blue });
  page.drawText('FICHE DE LIQUIDATION DE PRESTATION', { x: 135, y: 730, size: 17, font: bold });
  page.drawText(`N° ${safe(input.numero)}`, { x: 410, y: 700, size: 10, font: bold });

  const rows: Array<[string, string]> = [
    ['Adherent', `${safe(input.nom)} ${safe(input.prenoms)}`],
    ['Matricule', safe(input.matricule)],
    ['Type de prestation', safe(input.type)],
    ['Date de demande', safe(input.dateDemande)],
    ['Montant calcule', formatMoney(input.montant)],
    ['Statut du dossier', safe(input.statut)],
  ];
  let y = 640;
  for (const [label, value] of rows) {
    page.drawText(label, { x: 90, y, size: 10, font: bold, color: blue });
    page.drawText(value.slice(0, 55), { x: 270, y, size: 11, font: regular });
    page.drawLine({ start: { x: 85, y: y - 10 }, end: { x: 510, y: y - 10 }, thickness: 0.5, color: rgb(0.8, 0.82, 0.85) });
    y -= 55;
  }
  page.drawText('Montant issu du moteur actuariel et des paramètres applicables à la date de calcul.', {
    x: 85, y: 255, size: 9, font: regular,
  });
  page.drawText('Gestionnaire', { x: 100, y: 170, size: 10, font: bold });
  page.drawText('Contrôleur', { x: 260, y: 170, size: 10, font: bold });
  page.drawText('Approbateur', { x: 410, y: 170, size: 10, font: bold });
  return pdf.save();
}

export async function genererAvisAnnuelPdf(input: {
  annee: number;
  nom: string;
  prenoms: string;
  matricule: string;
  capitalAcquis: number;
  provisionMathematique: number;
  valeurRachat: number;
  primesPeriodiques: number;
  cotisationUnique: number;
  dateCalcul: string;
  versionCalcul: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.08, 0.2, 0.38);
  const green = rgb(0.08, 0.45, 0.28);

  page.drawText('MADGI - EPARGNE SANTE RETRAITE', { x: 165, y: 790, size: 15, font: bold, color: blue });
  page.drawText(`AVIS ANNUEL DE SITUATION - ${input.annee}`, { x: 145, y: 744, size: 17, font: bold, color: green });
  page.drawLine({ start: { x: 70, y: 724 }, end: { x: 525, y: 724 }, thickness: 1.2, color: blue });

  const identite: Array<[string, string]> = [
    ['Adherent', `${safe(input.nom)} ${safe(input.prenoms)}`],
    ['Matricule', safe(input.matricule)],
    ['Date de situation', safe(input.dateCalcul)],
    ['Version de calcul', safe(input.versionCalcul)],
  ];
  let y = 680;
  for (const [label, value] of identite) {
    page.drawText(label, { x: 85, y, size: 10, font: bold, color: blue });
    page.drawText(value.slice(0, 62), { x: 230, y, size: 10, font: regular });
    y -= 30;
  }

  page.drawText('SITUATION DU COMPTE ESR', { x: 85, y: 535, size: 12, font: bold, color: blue });
  const lignes: Array<[string, number]> = [
    ['Primes periodiques cumulees', input.primesPeriodiques],
    ['Cotisation unique', input.cotisationUnique],
    ['Capital acquis', input.capitalAcquis],
    ['Provision mathematique', input.provisionMathematique],
    ['Valeur de rachat indicative', input.valeurRachat],
  ];
  y = 490;
  for (const [label, montant] of lignes) {
    page.drawRectangle({
      x: 85, y: y - 10, width: 425, height: 34,
      borderWidth: 0.5, borderColor: rgb(0.8, 0.83, 0.87), color: rgb(0.97, 0.98, 0.99),
    });
    page.drawText(label, { x: 98, y, size: 10, font: regular });
    page.drawText(formatMoney(montant), { x: 360, y, size: 10, font: bold, color: blue });
    y -= 43;
  }

  page.drawText('Montants calcules selon les parametres en vigueur a la date de situation.', {
    x: 85, y: 225, size: 9, font: regular, color: rgb(0.35, 0.38, 0.42),
  });
  page.drawText('Cet avis de situation ne vaut pas ordre de paiement.', {
    x: 85, y: 207, size: 9, font: regular, color: rgb(0.35, 0.38, 0.42),
  });
  page.drawText(`Document genere le ${new Date().toISOString().slice(0, 10)}`, {
    x: 85, y: 65, size: 8, font: regular, color: rgb(0.45, 0.48, 0.52),
  });
  return pdf.save();
}

export async function genererReleveComptePdf(input: {
  nom: string;
  prenoms: string;
  matricule: string;
  dateCalcul: string;
  capitalAcquis: number;
  provisionMathematique: number;
  valeurRachat: number;
  cotisations: Array<{ periode: string; montant: number; dateValeur: string; source: string }>;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.17, 0.32, 0.62);
  const slate = rgb(0.25, 0.3, 0.38);
  const light = rgb(0.95, 0.97, 0.99);
  const generatedAt = formatDateFr(new Date().toISOString().slice(0, 10));
  const totalCotise = input.cotisations.reduce((sum, row) => sum + Number(row.montant || 0), 0);

  let pageNumber = 0;
  let page = pdf.addPage([595.28, 841.89]);
  let y = 0;

  const drawHeader = (continuation = false) => {
    pageNumber += 1;
    page.drawText("MUTUELLE DES AGENTS DE LA DIRECTION GENERALE DES IMPOTS", { x: 82, y: 800, size: 11, font: bold, color: blue });
    page.drawText("EPARGNE SANTE ET RETRAITE", { x: 205, y: 783, size: 9, font: bold, color: rgb(0.82, 0.48, 0.08) });
    page.drawLine({ start: { x: 50, y: 768 }, end: { x: 545, y: 768 }, thickness: 1.4, color: blue });
    page.drawText(continuation ? "RELEVE DE COMPTE - SUITE" : "RELEVE DE COMPTE INDIVIDUEL", { x: continuation ? 190 : 162, y: 738, size: 16, font: bold, color: slate });
    page.drawText(`Page ${pageNumber}`, { x: 500, y: 30, size: 8, font: regular, color: slate });
    page.drawText(`Document genere le ${generatedAt}`, { x: 50, y: 30, size: 8, font: regular, color: slate });
    y = 705;
  };

  const drawTableHeader = () => {
    page.drawRectangle({ x: 50, y: y - 5, width: 495, height: 26, color: blue });
    const headers = [['Periode', 60], ['Date de valeur', 140], ['Origine', 260], ['Montant encaisse', 405]] as const;
    for (const [label, x] of headers) page.drawText(label, { x, y: y + 4, size: 8, font: bold, color: rgb(1, 1, 1) });
    y -= 30;
  };

  drawHeader();
  page.drawRectangle({ x: 50, y: 628, width: 495, height: 65, color: light, borderColor: rgb(0.82, 0.85, 0.9), borderWidth: 0.7 });
  page.drawText('Adherent', { x: 65, y: 670, size: 9, font: bold, color: blue });
  page.drawText(`${safe(input.nom)} ${safe(input.prenoms)}`.slice(0, 62), { x: 150, y: 670, size: 10, font: regular });
  page.drawText('Matricule', { x: 65, y: 647, size: 9, font: bold, color: blue });
  page.drawText(safe(input.matricule), { x: 150, y: 647, size: 10, font: regular });
  page.drawText('Date de situation', { x: 340, y: 647, size: 9, font: bold, color: blue });
  page.drawText(formatDateFr(input.dateCalcul), { x: 445, y: 647, size: 10, font: regular });

  page.drawText('SITUATION FINANCIERE', { x: 50, y: 595, size: 11, font: bold, color: blue });
  const summary = [
    ['Total des cotisations encaissees', totalCotise],
    ['Capital acquis', input.capitalAcquis],
    ['Provision mathematique', input.provisionMathematique],
    ['Valeur de rachat estimative', input.valeurRachat],
  ] as const;
  y = 560;
  for (const [label, amount] of summary) {
    page.drawRectangle({ x: 50, y: y - 8, width: 495, height: 28, color: light, borderColor: rgb(0.86, 0.88, 0.92), borderWidth: 0.4 });
    page.drawText(label, { x: 62, y, size: 9, font: regular, color: slate });
    page.drawText(formatMoney(amount), { x: 402, y, size: 9, font: bold, color: blue });
    y -= 34;
  }

  page.drawText('HISTORIQUE DES COTISATIONS EFFECTIVEMENT ENCAISSEES', { x: 50, y: y - 2, size: 10, font: bold, color: blue });
  y -= 34;
  drawTableHeader();

  if (input.cotisations.length === 0) {
    page.drawText('Aucune cotisation encaissee a la date du releve.', { x: 62, y, size: 9, font: regular, color: slate });
  } else {
    for (const [index, row] of input.cotisations.entries()) {
      if (y < 70) {
        page = pdf.addPage([595.28, 841.89]);
        drawHeader(true);
        drawTableHeader();
      }
      if (index % 2 === 0) page.drawRectangle({ x: 50, y: y - 7, width: 495, height: 24, color: light });
      page.drawText(safe(row.periode), { x: 60, y, size: 8.5, font: regular });
      page.drawText(formatDateFr(row.dateValeur) || '-', { x: 140, y, size: 8.5, font: regular });
      page.drawText(safe(row.source).replace(/_/g, ' ').slice(0, 22), { x: 260, y, size: 8.5, font: regular });
      page.drawText(formatMoney(Number(row.montant || 0)), { x: 405, y, size: 8.5, font: bold, color: slate });
      y -= 25;
    }
  }

  page.drawText('Seules les cotisations effectivement encaissees figurent sur ce releve.', { x: 50, y: 52, size: 8, font: regular, color: slate });
  return pdf.save();
}
