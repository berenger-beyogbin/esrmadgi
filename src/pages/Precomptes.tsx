import React, { useEffect, useRef, useState } from 'react';
import type { CellValue, Worksheet } from 'exceljs';
import { cotisationService } from '../services/cotisationService';
import type { RetourDgiResult } from '../services/cotisationService';
import { adherentService } from '../services/adherentService';
import { VPrecompteDetails, DBUser, GeneratePrecomptesResult, PeriodeMetier } from '../types';
import { Download, FileCheck, Loader2, Play, Upload, X, CheckCircle2 } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface PrecomptesProps {
  currentUser: DBUser;
}

const STATUT_STYLES: Record<string, string> = {
  GENERE:   'bg-blue-50 text-blue-700 border-blue-200',
  INITIE:   'bg-slate-50 text-slate-600 border-slate-200',
  ENCAISSE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIEL:  'bg-amber-50 text-amber-700 border-amber-200',
  REJETE:   'bg-rose-50 text-rose-700 border-rose-200',
  ECART: 'bg-amber-50 text-amber-700 border-amber-200',
  NON_PRECOMPTE: 'bg-rose-50 text-rose-700 border-rose-200',
  REPORTE: 'bg-slate-50 text-slate-600 border-slate-200',
  REGULARISE: 'bg-violet-50 text-violet-700 border-violet-200',
};

function normalizedRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key.trim().toUpperCase().replace(/[\s-]+/g, '_'),
      value,
    ]),
  );
}

function firstValue(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== '') return record[key];
  }
  return undefined;
}

function parseDateToIso(value: unknown): string | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return undefined;
}

function excelCellToValue(value: CellValue): unknown {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value !== 'object') return value;
  if ('text' in value && typeof value.text === 'string') return value.text;
  if ('result' in value) return value.result ?? '';
  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('');
  }
  return String(value);
}

function worksheetToRows(worksheet: Worksheet): Record<string, unknown>[] {
  const headerValues = worksheet.getRow(1).values as CellValue[];
  const headers = headerValues.slice(1).map((value) => String(excelCellToValue(value)).trim());
  if (headers.length === 0 || headers.every((header) => !header)) {
    throw new Error('Le fichier Excel doit contenir une ligne d en-tete.');
  }

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const values = row.values as CellValue[];
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = excelCellToValue(values[index + 1]);
    });
    rows.push(record);
  });

  return rows;
}

function downloadWorkbook(buffer: BlobPart, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Precomptes({ currentUser }: PrecomptesProps) {
  const [precomptes, setPrecomptes] = useState<VPrecompteDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [periodeGenerer, setPeriodeGenerer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GeneratePrecomptesResult | null>(null);

  const [periodesOuvertes, setPeriodesOuvertes] = useState<PeriodeMetier[]>([]);
  const [isLoadingPeriodes, setIsLoadingPeriodes] = useState(false);
  const [isCloturant, setIsCloturant] = useState(false);
  const [cloturerError, setCloturerError] = useState<string | null>(null);
  const [dejaGenere, setDejaGenere] = useState(false);
  const [isCheckingGenere, setIsCheckingGenere] = useState(false);

  const [isExportingGenere, setIsExportingGenere] = useState(false);
  const retourSectionRef = useRef<HTMLDivElement>(null);

  const retourFileInputRef = useRef<HTMLInputElement>(null);
  const [dateRetour] = useState(new Date().toISOString().split('T')[0]);
  const [isProcessingRetour, setIsProcessingRetour] = useState(false);
  const [retourError, setRetourError] = useState<string | null>(null);
  const [retourResult, setRetourResult] = useState<RetourDgiResult | null>(null);
  const [selectedRetourFile, setSelectedRetourFile] = useState<File | null>(null);

  const [statutFilter, setStatutFilter] = useState('TOUS');

  const [selectedRegularisation, setSelectedRegularisation] = useState<VPrecompteDetails | null>(null);
  const [montantRegul, setMontantRegul] = useState('');
  const [modeRegul, setModeRegul] = useState('VIREMENT');
  const [dateRegul, setDateRegul] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingRegul, setIsSubmittingRegul] = useState(false);
  const [regulError, setRegulError] = useState<string | null>(null);

  const canGenerate =
    currentUser.role === 'GESTIONNAIRE' ||
    currentUser.role === 'ADMINISTRATEUR' ||
    currentUser.role === 'SUPERADMIN';
  const selectedPeriode = periodesOuvertes.find((item) => item.periode === periodeGenerer);
  const isSelectedPeriodeCloturee = selectedPeriode?.statut === 'CLOTUREE';
  const periodeStatusLabel = !selectedPeriode
    ? 'Période'
    : isSelectedPeriodeCloturee
      ? 'Période (clôturée)'
      : 'Période (non clôturée)';

  const fetchPrecomptes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await cotisationService.getPrecomptes({
        search: periodeGenerer.trim() || undefined,
      });
      if (error) throw error;
      setPrecomptes(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Erreur de chargement des précomptes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrecomptes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodeGenerer]);

  const fetchPeriodesOuvertes = async () => {
    setIsLoadingPeriodes(true);
    const { data, error } = await cotisationService.getPeriodesOuvertes();
    setIsLoadingPeriodes(false);
    if (error) {
      setCloturerError(error.message);
      return;
    }
    setPeriodesOuvertes(data);
    setPeriodeGenerer((prev) => (data.some((p) => p.periode === prev) ? prev : data[0]?.periode ?? ''));
  };

  useEffect(() => {
    if (canGenerate) fetchPeriodesOuvertes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canGenerate]);

  useEffect(() => {
    if (!periodeGenerer) {
      setDejaGenere(false);
      return;
    }
    let cancelled = false;
    setIsCheckingGenere(true);
    cotisationService.getPrecomptesMapByPeriode(periodeGenerer).then(({ data }) => {
      if (cancelled) return;
      setDejaGenere(data.size > 0);
      setIsCheckingGenere(false);
    });
    return () => { cancelled = true; };
  }, [periodeGenerer]);

  const handleGenerate = async () => {
    const periode = periodeGenerer.trim().toUpperCase();
    if (!periode) {
      setErrorMsg('Veuillez sélectionner une période.');
      return;
    }
    setIsGenerating(true);
    setGenerateResult(null);
    setErrorMsg(null);
    const { result, error } = await cotisationService.generatePrecomptes(periode);
    setIsGenerating(false);
    setGenerateResult(result);
    if (error && result.created === 0) {
      setErrorMsg(error.message || 'Erreur lors de la génération.');
    } else {
      fetchPrecomptes();
      if (result.created > 0) setDejaGenere(true);
    }
  };

  const handleExportGenere = async () => {
    const periode = periodeGenerer.trim().toUpperCase();
    if (!periode) return;
    setIsExportingGenere(true);
    setErrorMsg(null);
    try {
      const { data, error } = await cotisationService.getPrecomptes({ search: periode });
      if (error) throw error;
      const lignes = (data || []).filter((p) => p.periode === periode);
      if (lignes.length === 0) {
        setErrorMsg(`Aucun précompte trouvé pour la période ${periode}.`);
        return;
      }
      const { data: adherents, error: adherentsError } = await adherentService.getAdherents();
      if (adherentsError) throw adherentsError;
      const gradeParMatricule = new Map(
        (adherents || []).map((a) => [a.matricule, a.grade_libelle || a.grade_code || '']),
      );
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Precomptes');
      worksheet.columns = [
        { header: "N° D'ORDRE", key: 'ordre', width: 10 },
        { header: 'MADGI_MATRICULE', key: 'matricule', width: 16 },
        { header: 'AGENT_NOM', key: 'agent_nom', width: 30 },
        { header: 'CATEGORIE', key: 'categorie', width: 12 },
        { header: 'PERIODE', key: 'periode', width: 10 },
        { header: 'MADGI_ESR', key: 'madgi_esr', width: 16 },
      ];
      lignes.forEach((p, index) => worksheet.addRow({
        ordre: index + 1,
        matricule: p.matricule,
        agent_nom: `${p.nom} ${p.prenoms}`,
        categorie: gradeParMatricule.get(p.matricule) || '',
        periode: p.periode,
        madgi_esr: p.montant_depart,
      }));
      const buffer = await workbook.xlsx.writeBuffer();
      downloadWorkbook(buffer, `precomptes_${periode}.xlsx`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors de l'export du fichier de précomptes.");
    } finally {
      setIsExportingGenere(false);
    }
  };

  const handleAllerRetourPrecompte = () => {
    retourSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCloturerPeriode = async () => {
    const periode = periodeGenerer.trim().toUpperCase();
    if (!periode) return;
    if (!window.confirm(`Clôturer définitivement la période ${periode} ? Aucun précompte ne pourra plus y être généré.`)) {
      return;
    }
    setIsCloturant(true);
    setCloturerError(null);
    const { error } = await cotisationService.cloturerPeriode(periode);
    setIsCloturant(false);
    if (error) {
      setCloturerError(error.message);
      return;
    }
    await fetchPeriodesOuvertes();
  };

  const handleExport = () => {
    alert('Export au format XLS / Trésor public : fonctionnalité non active dans cette version.');
  };

  const handleSelectRetourFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRetourError(null);
    setRetourResult(null);
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setRetourError('Le retour DGI doit être un fichier Excel .xlsx.');
      setSelectedRetourFile(null);
      if (retourFileInputRef.current) retourFileInputRef.current.value = '';
      return;
    }
    setSelectedRetourFile(file);
  };

  const handleRetourDgiFile = async () => {
    const file = selectedRetourFile;
    if (!file) {
      setRetourError('Veuillez sélectionner un fichier de retour précompte.');
      return;
    }
    const periode = periodeGenerer.trim().toUpperCase();
    if (!/^\d{4}T[1-4]$/.test(periode)) {
      setRetourError('Veuillez saisir une période valide, par exemple 2026T2.');
      return;
    }

    setIsProcessingRetour(true);
    setRetourError(null);
    setRetourResult(null);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('Le fichier ne contient aucune feuille.');

      const lignes = worksheetToRows(worksheet).map(normalizedRecord).map((row) => {
        const matricule = String(firstValue(row, [
          'MADGI_MATRICULE', 'MATRICULE', 'MATRICULE_AGENT',
        ]) ?? '').trim();
        const rawMontant = firstValue(row, [
          'MONTANTRETOUR', 'MONTANT_RETOUR', 'MONTANT_PRECOMPTE', 'MONTANT_EFFECTIVEMENT_PRECOMPTE',
        ]);
        const rawDate = firstValue(row, ['DATERETOUR', 'DATE_RETOUR']);
        const motif = String(firstValue(row, ['MOTIF', 'OBSERVATION', 'COMMENTAIRE']) ?? '').trim();
        return {
          matricule,
          montantRetour: Number(String(rawMontant ?? '0').replace(/\s/g, '').replace(',', '.')) || 0,
          dateRetour: parseDateToIso(rawDate),
          motif,
        };
      }).filter((row) => row.matricule && Number.isFinite(row.montantRetour) && row.montantRetour >= 0);

      if (lignes.length === 0) {
        throw new Error('Aucune ligne exploitable. Colonne attendue : MADGI_MATRICULE.');
      }
      const { result, error } = await cotisationService.enregistrerRetourDgi({
        periode,
        dateRetour,
        lignes,
      });
      if (error) throw error;
      setRetourResult(result);
      await fetchPrecomptes();
    } catch (error: any) {
      setRetourError(error?.message || 'Erreur pendant le traitement du retour DGI.');
    } finally {
      setIsProcessingRetour(false);
      setSelectedRetourFile(null);
      if (retourFileInputRef.current) retourFileInputRef.current.value = '';
    }
  };

  const openRegulariserModal = (p: VPrecompteDetails) => {
    setSelectedRegularisation(p);
    setMontantRegul(String(p.montant_depart ?? ''));
    setModeRegul('VIREMENT');
    setDateRegul(new Date().toISOString().split('T')[0]);
    setRegulError(null);
  };

  const closeRegulariserModal = () => {
    if (isSubmittingRegul) return;
    setSelectedRegularisation(null);
  };

  const handleValiderRegularisation = async () => {
    if (!selectedRegularisation) return;
    setRegulError(null);
    const montantNum = Number(montantRegul);
    if (!montantNum || montantNum <= 0) {
      setRegulError('Le montant versé doit être supérieur à 0.');
      return;
    }
    if (!dateRegul) {
      setRegulError('La date est obligatoire.');
      return;
    }

    setIsSubmittingRegul(true);
    const { error } = await cotisationService.createCotisationSpontanee({
      id_adherent: String(selectedRegularisation.id_adherent),
      matricule: selectedRegularisation.matricule,
      mode: modeRegul,
      date: dateRegul,
      montant: montantNum,
      id_precompte: selectedRegularisation.id_precompte,
    });
    setIsSubmittingRegul(false);

    if (error) {
      setRegulError(error.message);
      return;
    }
    setSelectedRegularisation(null);
    await fetchPrecomptes();
  };

  const filteredPrecomptes = statutFilter === 'TOUS'
    ? precomptes
    : precomptes.filter((p) => p.statut_precompte === statutFilter);
  const statutsDisponibles = Array.from(new Set([
    ...Object.keys(STATUT_STYLES),
    ...precomptes.map((precompte) => precompte.statut_precompte).filter(Boolean),
  ]));

  return (
    <div className="space-y-6" id="precomptes-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Gestion des Précomptes</h2>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Génération */}
      {canGenerate && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide font-mono">Générer un fichier de précompte</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className={`block text-xs uppercase mb-1 font-mono ${isSelectedPeriodeCloturee ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                {periodeStatusLabel}
              </label>
              <select
                value={periodeGenerer}
                onChange={(e) => setPeriodeGenerer(e.target.value)}
                disabled={isLoadingPeriodes || periodesOuvertes.length === 0}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-[#2b529f] focus:outline-none font-mono disabled:opacity-50"
              >
                {periodesOuvertes.length === 0 && <option value="">Aucune période ouverte</option>}
                {periodesOuvertes.map((p) => (
                  <option key={p.periode} value={p.periode}>
                    {p.periode} — {p.statut === 'CLOTUREE' ? 'Clôturée' : 'Non clôturée'}
                  </option>
                ))}
              </select>
            </div>
            {!dejaGenere && (
              <button
                id="btn-generer-precomptes"
                onClick={handleGenerate}
                disabled={isGenerating || isCheckingGenere || !periodeGenerer || isSelectedPeriodeCloturee}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 shrink-0"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Générer les précomptes
              </button>
            )}
            {dejaGenere && !isCheckingGenere && (
              <>
                <button
                  id="btn-generer-fichier"
                  onClick={handleExportGenere}
                  disabled={isExportingGenere || !periodeGenerer}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#2b529f] hover:bg-blue-50 text-[#2b529f] rounded-xl text-sm font-bold transition disabled:opacity-50 shrink-0"
                >
                  {isExportingGenere ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Générer le fichier
                </button>
                <button
                  id="btn-retour-precompte"
                  onClick={handleAllerRetourPrecompte}
                  disabled={!periodeGenerer}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-400 hover:bg-amber-50 text-amber-600 rounded-xl text-sm font-bold transition disabled:opacity-50 shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  Retour précompte
                </button>
              </>
            )}
          </div>
          {cloturerError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">{cloturerError}</div>
          )}
          {generateResult && (
            <div className={`p-3 rounded-xl text-sm ${generateResult.failed > 0 || generateResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'}`}>
              Précomptes générés : <strong>{generateResult.created} créés</strong>, {generateResult.skipped} ignorés, {generateResult.failed} erreurs.
              {generateResult.errors.length > 0 && (
                <ul className="mt-1 list-disc list-inside text-rose-700 space-y-0.5">
                  {generateResult.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {generateResult.errors.length > 5 && <li>…et {generateResult.errors.length - 5} autres</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtre et actualisation */}
      {canGenerate && dejaGenere && (
        <div ref={retourSectionRef} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide font-mono">
              Retour DGI - montants effectivement précomptés
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 min-w-0">
              <label className="block text-xs text-slate-600 uppercase mb-1 font-mono">Fichier retour précompte (.xlsx)</label>
              <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm cursor-pointer hover:border-[#2b529f] hover:text-[#2b529f] truncate">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">{selectedRetourFile ? selectedRetourFile.name : 'Sélectionner le fichier'}</span>
                <input
                  ref={retourFileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  disabled={isProcessingRetour}
                  onChange={handleSelectRetourFile}
                />
              </label>
            </div>
            <button
              id="btn-importer-retour-dgi"
              onClick={handleRetourDgiFile}
              disabled={isProcessingRetour || !selectedRetourFile}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 shrink-0"
            >
              {isProcessingRetour ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isProcessingRetour ? 'Import en cours...' : 'Importer le retour DGI'}
            </button>
          </div>
          {retourError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
              {retourError}
            </div>
          )}
          {retourResult && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs">
              <div><strong>{retourResult.total}</strong><br />Lignes</div>
              <div><strong className="text-emerald-700">{retourResult.rapproches}</strong><br />Conformes</div>
              <div><strong className="text-amber-700">{retourResult.ecarts}</strong><br />Écarts</div>
              <div><strong className="text-rose-700">{retourResult.nonPrecomptes}</strong><br />Non-précomptés</div>
              <div><strong>{retourResult.introuvables.length}</strong><br />Introuvables</div>
            </div>
          )}
        </div>
      )}

      {/* Tableau */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm font-medium">Chargement des précomptes...</span>
        </div>
      ) : precomptes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-sm">Aucun précompte trouvé.</p>
        </div>
      ) : (
        <ScrollableTableWrapper>
          <table className="w-full table-fixed divide-y divide-slate-100 text-xs text-left text-slate-700" id="tbl-precomptes">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[15%]" />
              <col className="w-[7%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-[10px]">
              <tr>
                <th className="py-3 px-2">Matricule</th>
                <th className="py-3 px-2">Adhérent</th>
                <th className="py-3 px-2">Période</th>
                <th className="py-3 px-2 text-right">Montant départ</th>
                <th className="py-3 px-2 text-center">Date génération</th>
                <th className="py-3 px-2 text-right">Montant retour</th>
                <th className="py-3 px-2 text-center">Date retour</th>
                <th className="py-3 px-2 text-center">
                  <select
                    id="filter-statut-precompte"
                    value={statutFilter}
                    onChange={(e) => setStatutFilter(e.target.value)}
                    className="w-full min-w-0 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-center text-[10px] font-bold uppercase tracking-normal text-slate-600 focus:ring-2 focus:ring-[#2b529f] focus:outline-none normal-case"
                  >
                    <option value="TOUS">Statut (Tous)</option>
                    {statutsDisponibles.map((statut) => (
                      <option key={statut} value={statut}>{statut}</option>
                    ))}
                  </select>
                </th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPrecomptes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400 text-sm">
                    Aucun précompte avec le statut {statutFilter}.
                  </td>
                </tr>
              ) : filteredPrecomptes.map((p) => (
                <tr key={p.id_precompte} className="hover:bg-slate-50/50 transition">
                  <td className="py-2.5 px-2 font-bold font-mono text-slate-700 truncate">{p.matricule}</td>
                  <td className="py-2.5 px-2 font-semibold text-slate-800 uppercase leading-snug break-words">{p.nom} {p.prenoms}</td>
                  <td className="py-2.5 px-2 font-mono text-slate-600 whitespace-nowrap">{p.periode}</td>
                  <td className="py-2.5 px-2 text-right font-semibold font-mono text-slate-700 whitespace-nowrap">
                    {formatFCFA(p.montant_depart)}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-500 whitespace-nowrap">
                    {formatDateFr(p.date_generation)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-800 whitespace-nowrap">
                    {p.montant_retour > 0 ? formatFCFA(p.montant_retour) : '-'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-500 whitespace-nowrap">
                    {formatDateFr(p.date_retour)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-flex max-w-full items-center gap-1 px-2 py-1 rounded-full font-bold text-[10px] whitespace-nowrap border ${STATUT_STYLES[p.statut_precompte] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {p.statut_precompte === 'ENCAISSE' && <FileCheck className="w-3 h-3" />}
                      {p.statut_precompte}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {p.statut_precompte === 'NON_PRECOMPTE' && (
                        <button
                          id={`btn-regulariser-${p.id_precompte}`}
                          onClick={() => openRegulariserModal(p)}
                          className="max-w-full px-1.5 py-1 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-lg text-[10px] font-bold transition"
                        >
                          Régulariser
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableWrapper>
      )}

      {selectedRegularisation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeRegulariserModal}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2b529f] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">
                Régularisation de non précompte | Cotisation spontanée
              </h3>
              <button onClick={closeRegulariserModal} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {regulError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
                  {regulError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Adhérent</label>
                <input
                  readOnly
                  value={`${selectedRegularisation.matricule} - ${selectedRegularisation.nom} ${selectedRegularisation.prenoms}`}
                  className="block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Cotisation trimestrielle</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-bold text-center">
                  {formatFCFA(selectedRegularisation.montant_depart)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
                  Montant versé <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={montantRegul}
                  onChange={(e) => setMontantRegul(e.target.value)}
                  placeholder="0"
                  className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
                  Mode Versement <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modeRegul}
                  onChange={(e) => setModeRegul(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
                >
                  {['VIREMENT', 'CHEQUE', 'ESPECES'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateRegul}
                  onChange={(e) => setDateRegul(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
                />
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleValiderRegularisation}
                  disabled={isSubmittingRegul}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                >
                  {isSubmittingRegul ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Valider
                </button>
                <button
                  onClick={closeRegulariserModal}
                  disabled={isSubmittingRegul}
                  className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-bold transition disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
