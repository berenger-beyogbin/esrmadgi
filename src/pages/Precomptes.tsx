import React, { useEffect, useRef, useState } from 'react';
import type { CellValue, Worksheet } from 'exceljs';
import { cotisationService } from '../services/cotisationService';
import { VPrecompteDetails, DBUser, GeneratePrecomptesResult } from '../types';
import { FileSpreadsheet, Download, RefreshCw, AlertCircle, FileCheck, Loader2, Play, Upload } from 'lucide-react';
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
};

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
  const [search, setSearch] = useState('');

  const [periodeGenerer, setPeriodeGenerer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GeneratePrecomptesResult | null>(null);

  const [periodeCompta, setPeriodeCompta] = useState('');
  const [enrichedRows, setEnrichedRows] = useState<Record<string, unknown>[]>([]);
  const [enrichSummary, setEnrichSummary] = useState<{
    lignes: number; rapproches: number; introuvables: number; totalMontant: number;
  } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canGenerate =
    currentUser.role === 'GESTIONNAIRE' ||
    currentUser.role === 'ADMINISTRATEUR' ||
    currentUser.role === 'SUPERADMIN';

  const fetchPrecomptes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await cotisationService.getPrecomptes({
        search: search.trim() || undefined,
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
  }, [search]);

  const handleGenerate = async () => {
    const periode = periodeGenerer.trim().toUpperCase();
    if (!periode) {
      setErrorMsg('Veuillez saisir une période au format 2026T2.');
      return;
    }
    if (!/^\d{4}T[1-4]$/.test(periode)) {
      setErrorMsg('Format de période invalide. Attendu : 2026T2');
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
    }
  };

  const handleExport = () => {
    alert('Export au format XLS / Trésor public : fonctionnalité non active dans cette version.');
  };

  const handleComptaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setFileError('Seuls les fichiers Excel .xlsx sont acceptes.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const periode = periodeCompta.trim().toUpperCase();
    if (!periode || !/^\d{4}T[1-4]$/.test(periode)) {
      setFileError("Veuillez d'abord saisir une période valide (ex : 2026T2).");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setIsProcessingFile(true);
    setFileError(null);
    setEnrichSummary(null);
    setEnrichedRows([]);
    try {
      const { data: precomptesMap, error: mapErr } = await cotisationService.getPrecomptesMapByPeriode(periode);
      if (mapErr) throw mapErr;
      const ExcelJS = await import('exceljs');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) throw new Error('Le fichier Excel ne contient aucune feuille.');
      const rows = worksheetToRows(worksheet);
      let rapproches = 0, introuvables = 0, totalMontant = 0;
      const enriched = rows.map(row => {
        const matricule = String((row as any)['MADGI_MATRICULE'] ?? '').trim();
        const montant = precomptesMap.get(matricule);
        if (matricule && montant !== undefined) {
          rapproches++;
          totalMontant += montant;
          return { ...row, MONTANT_ESR_PRECOMPTE: montant };
        }
        introuvables++;
        return { ...row, MONTANT_ESR_PRECOMPTE: '' };
      });
      setEnrichedRows(enriched);
      setEnrichSummary({ lignes: rows.length, rapproches, introuvables, totalMontant });
    } catch (e: any) {
      setFileError(e?.message || 'Erreur lors du traitement du fichier.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportEnrichi = async () => {
    if (!enrichedRows.length) return;
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Depart ESR');
    const headers: string[] = Array.from(new Set<string>(enrichedRows.flatMap((row) => Object.keys(row))));

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(header.length + 2, 12), 32),
    }));
    enrichedRows.forEach((row) => worksheet.addRow(row));
    const periode = periodeCompta.trim().toUpperCase() || 'PERIODE';
    const buffer = await workbook.xlsx.writeBuffer();
    downloadWorkbook(buffer, `depart_compta_enrichi_${periode}.xlsx`);
  };

  return (
    <div className="space-y-6" id="precomptes-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Gestion des Précomptes</h2>
          <p className="text-slate-600 text-sm mt-1">
            Suivi des prélèvements sur salaire des agents.
          </p>
        </div>
        <button
          id="btn-export-precomptes"
          disabled
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-300 text-slate-500 rounded-xl text-sm font-semibold tracking-wide cursor-not-allowed shrink-0"
          title="Export à finaliser dans une prochaine version"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export à finaliser
        </button>
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
              <label className="block text-xs text-slate-600 uppercase mb-1 font-mono">Période (ex : 2026T2)</label>
              <input
                type="text"
                placeholder="2026T2"
                value={periodeGenerer}
                onChange={(e) => setPeriodeGenerer(e.target.value.toUpperCase())}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-[#2b529f] focus:outline-none font-mono"
              />
            </div>
            <button
              id="btn-generer-precomptes"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 shrink-0"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Générer les précomptes
            </button>
          </div>
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

      {/* Fichier comptabilité de départ */}
      {canGenerate && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide font-mono">Fichier comptabilité de départ</p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-400 uppercase mb-1 font-mono">Période (ex : 2026T2)</label>
              <input
                type="text"
                placeholder="2026T2"
                value={periodeCompta}
                onChange={(e) => setPeriodeCompta(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:ring-2 focus:ring-[#2b529f] focus:outline-none font-mono"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-600 uppercase mb-1 font-mono">Fichier comptabilité (.xlsx)</label>
              <label className={`flex items-center gap-2 px-4 py-2.5 border border-dashed rounded-xl text-sm cursor-pointer transition ${isProcessingFile ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-300 text-slate-500 hover:border-[#2b529f] hover:text-[#2b529f]'}`}>
                {isProcessingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isProcessingFile ? 'Traitement en cours...' : 'Charger fichier comptabilité'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleComptaFile}
                  disabled={isProcessingFile}
                />
              </label>
            </div>
          </div>
          {fileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">{fileError}</div>
          )}
          {enrichSummary && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl space-y-3">
                <div className="font-bold">Rapprochement — {periodeCompta}</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                    <div className="font-mono font-bold text-slate-800 text-lg">{enrichSummary.lignes}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Lignes lues</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                    <div className="font-mono font-bold text-emerald-700 text-lg">{enrichSummary.rapproches}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Rapprochés</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                    <div className="font-mono font-bold text-amber-600 text-lg">{enrichSummary.introuvables}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Introuvables</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                    <div className="font-mono font-bold text-[#2b529f] text-base leading-tight">{formatFCFA(enrichSummary.totalMontant)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Total ESR précompte</div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleExportEnrichi}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                Exporter fichier départ enrichi
              </button>
            </>
          )}
        </div>
      )}

      {/* Filtre et actualisation */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <input
            id="input-precomptes-filter"
            type="text"
            placeholder="Filtrer par période (ex: 2026T2)..."
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
          />
          <RefreshCw className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
        </div>
        <button
          id="btn-refresh-precomptes"
          onClick={fetchPrecomptes}
          disabled={isLoading}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

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
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left text-slate-700" id="tbl-precomptes">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
              <tr>
                <th className="py-3.5 px-4">Matricule</th>
                <th className="py-3.5 px-4">Adhérent</th>
                <th className="py-3.5 px-4">Période</th>
                <th className="py-3.5 px-4 text-right">Montant départ</th>
                <th className="py-3.5 px-4 text-center">Date génération</th>
                <th className="py-3.5 px-4 text-right">Montant retour</th>
                <th className="py-3.5 px-4 text-center">Date retour</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {precomptes.map((p) => (
                <tr key={p.id_precompte} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 font-bold font-mono text-slate-700">{p.matricule}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 uppercase">{p.nom} {p.prenoms}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{p.periode}</td>
                  <td className="py-3 px-4 text-right font-semibold font-mono text-slate-700">
                    {formatFCFA(p.montant_depart)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {formatDateFr(p.date_generation)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-slate-800">
                    {p.montant_retour > 0 ? formatFCFA(p.montant_retour) : '-'}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {formatDateFr(p.date_retour)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs border ${STATUT_STYLES[p.statut_precompte] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {p.statut_precompte === 'ENCAISSE' && <FileCheck className="w-3 h-3" />}
                      {p.statut_precompte}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      id={`btn-exp-row-${p.id_precompte}`}
                      disabled
                      className="p-1 px-2 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed inline-flex items-center gap-1 font-semibold"
                      title="Export à finaliser"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>XLS</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableWrapper>
      )}

      {/* Info */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3 text-sm text-slate-600">
        <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-slate-700">Rapprochement automatique :</span> Les écarts négatifs proviennent de l'invalidation d'un ou plusieurs agents pour cause de mise en disponibilité, départ à la retraite non signalé ou cessation d'activité en cours de mois.
        </div>
      </div>
    </div>
  );
}
