import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cotisationService } from '../services/cotisationService';
import { VAdherentComplet } from '../types';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Save, Search, ChevronDown } from 'lucide-react';
import RecuVersement, { RecuVersementData } from '../components/RecuVersement';

interface CotisationSpontaneeProps {
  onClose: () => void;
}

const MODES_VERSEMENT = ['VIREMENT', 'CHEQUE', 'ESPECES'];

const formatFCFA = (val: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(val)
    .replace('XOF', 'FCFA');

const todayISO = () => new Date().toISOString().split('T')[0];

export default function CotisationSpontanee({ onClose }: CotisationSpontaneeProps) {
  const [adherents, setAdherents] = useState<VAdherentComplet[]>([]);
  const [isLoadingAdherents, setIsLoadingAdherents] = useState(true);

  const [selectedAdherentId, setSelectedAdherentId] = useState('');
  const [adherentQuery, setAdherentQuery] = useState('');
  const [isAdherentComboOpen, setIsAdherentComboOpen] = useState(false);
  const [highlightedAdherentIndex, setHighlightedAdherentIndex] = useState(0);
  const adherentComboRef = useRef<HTMLDivElement>(null);
  const [cotisationEs, setCotisationEs] = useState<number | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState(MODES_VERSEMENT[0]);
  const [date, setDate] = useState(todayISO);
  const [numeroCheque, setNumeroCheque] = useState('');
  const [banqueEmettrice, setBanqueEmettrice] = useState('');
  const [titulaireCheque, setTitulaireCheque] = useState('');
  const [dateEmissionCheque, setDateEmissionCheque] = useState(todayISO);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recuData, setRecuData] = useState<RecuVersementData | null>(null);

  useEffect(() => {
    async function loadAdherents() {
      setIsLoadingAdherents(true);
      const { data, error: err } = await cotisationService.getAdherentsPourCotisation();
      if (err) {
        setError(err.message || JSON.stringify(err));
      } else {
        setAdherents(data);
      }
      setIsLoadingAdherents(false);
    }
    loadAdherents();
  }, []);

  const handleAdherentChange = async (rawValue: string) => {
    setSelectedAdherentId(rawValue);
    setCotisationEs(null);
    setError(null);
    setSuccessMsg(null);
    const idAdherent = Number(rawValue);
    if (!rawValue || isNaN(idAdherent) || idAdherent <= 0) return;

    setIsLoadingInfo(true);
    const { data, error: err } = await cotisationService.getInfoCotisationActive(String(idAdherent));
    if (err) {
      setError(err.message || JSON.stringify(err));
    } else if (data) {
      setCotisationEs(data.cotisation_es);
    } else {
      setError('Aucune information de cotisation active trouvée pour cet adhérent.');
    }
    setIsLoadingInfo(false);
  };

  const normalizeSearch = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const filteredAdherents = useMemo(() => {
    const terms = normalizeSearch(adherentQuery).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return adherents.slice(0, 50);

    return adherents.filter((adherent) => {
      const searchable = normalizeSearch(`${adherent.matricule} ${adherent.nom ?? ''} ${adherent.prenoms ?? ''}`);
      return terms.every((term) => searchable.includes(term));
    }).slice(0, 50);
  }, [adherentQuery, adherents]);

  const selectAdherent = (adherent: VAdherentComplet) => {
    setAdherentQuery(`${adherent.matricule} — ${adherent.nom ?? ''} ${adherent.prenoms ?? ''}`.trim());
    setIsAdherentComboOpen(false);
    setHighlightedAdherentIndex(0);
    void handleAdherentChange(String(adherent.id_adherent));
  };

  const handleAdherentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsAdherentComboOpen(true);
      setHighlightedAdherentIndex((index) => Math.min(index + 1, Math.max(filteredAdherents.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedAdherentIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isAdherentComboOpen && filteredAdherents[highlightedAdherentIndex]) {
      event.preventDefault();
      selectAdherent(filteredAdherents[highlightedAdherentIndex]);
    } else if (event.key === 'Escape') {
      setIsAdherentComboOpen(false);
    }
  };

  const resetForm = () => {
    setSelectedAdherentId('');
    setAdherentQuery('');
    setIsAdherentComboOpen(false);
    setCotisationEs(null);
    setMontant('');
    setMode(MODES_VERSEMENT[0]);
    setDate(todayISO());
    setNumeroCheque('');
    setBanqueEmettrice('');
    setTitulaireCheque('');
    setDateEmissionCheque(todayISO());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedAdherentId) {
      setError('Veuillez sélectionner un adhérent.');
      return;
    }
    if (!montant || Number(montant) <= 0) {
      setError('Le montant versé doit être supérieur à 0.');
      return;
    }
    if (!date) {
      setError('La date est obligatoire.');
      return;
    }
    if (mode === 'CHEQUE' && (!numeroCheque.trim() || !banqueEmettrice.trim() || !titulaireCheque.trim() || !dateEmissionCheque)) {
      setError("Renseignez le numero, la banque, le titulaire et la date d'emission du cheque.");
      return;
    }

    const adherent = adherents.find((a) => a.id_adherent === Number(selectedAdherentId));
    if (!adherent) return;

    setIsSubmitting(true);
    const { data: result, error: createError } = await cotisationService.createCotisationSpontanee({
      id_adherent: selectedAdherentId,
      matricule: adherent.matricule,
      mode,
      date,
      montant: Number(montant),
      numero_cheque: mode === 'CHEQUE' ? numeroCheque.trim() : undefined,
      banque_emettrice: mode === 'CHEQUE' ? banqueEmettrice.trim() : undefined,
      titulaire_cheque: mode === 'CHEQUE' ? titulaireCheque.trim() : undefined,
      date_emission_cheque: mode === 'CHEQUE' ? dateEmissionCheque : undefined,
    });

    if (createError) {
      setError(createError.message || JSON.stringify(createError));
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg('Cotisation spontanée enregistrée avec succès.');
    if (result?.en_attente_validation) {
      setSuccessMsg(`Cheque enregistre sous le paiement #${result.paiement?.id ?? ''}. La cotisation sera comptabilisee apres compensation bancaire.`);
      setIsSubmitting(false);
      resetForm();
      return;
    }
    setRecuData({
      reference: result?.entete?.reference ?? '',
      nom: adherent.nom ?? '',
      prenoms: adherent.prenoms ?? '',
      matricule: adherent.matricule,
      montant: Number(montant),
      date_versement: date,
      nature_recette: 'Cotisation spontanée - Épargne Santé Retraite',
      periode_couverture: result?.detail?.periode ?? '',
      mode,
    });
    setIsSubmitting(false);
    resetForm();
  };

  if (isLoadingAdherents) {
    return (
      <div className="flex items-center justify-center h-48 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#2b529f]" />
        <span className="text-sm text-slate-500">Chargement des adhérents...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-md p-6 max-w-xl mx-auto">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-[#2b529f] uppercase tracking-wide">Cotisation spontanée</h2>
          <p className="text-sm text-slate-500 mt-0.5">Saisie d'un versement direct hors précompte</p>
        </div>
      </div>

      {/* Alertes */}
      {successMsg && (
        <div className="flex items-center gap-2 mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Adhérent */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
            Adhérent <span className="text-rose-500">*</span>
          </label>
          <div
            ref={adherentComboRef}
            className="relative"
            onBlur={(event) => {
              if (!adherentComboRef.current?.contains(event.relatedTarget as Node)) setIsAdherentComboOpen(false);
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              role="combobox"
              aria-expanded={isAdherentComboOpen}
              aria-controls="adherent-combo-options"
              aria-autocomplete="list"
              autoComplete="off"
              value={adherentQuery}
              onFocus={() => setIsAdherentComboOpen(true)}
              onKeyDown={handleAdherentKeyDown}
              onChange={(event) => {
                setAdherentQuery(event.target.value);
                setSelectedAdherentId('');
                setCotisationEs(null);
                setHighlightedAdherentIndex(0);
                setIsAdherentComboOpen(true);
              }}
              placeholder="Saisir un matricule, un nom ou des prénoms..."
              className="block w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Afficher la liste des adhérents"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setIsAdherentComboOpen((open) => !open)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-[#2b529f]"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isAdherentComboOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAdherentComboOpen && (
              <div id="adherent-combo-options" role="listbox" className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {filteredAdherents.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-slate-500 text-center">Aucun adhérent trouvé.</p>
                ) : filteredAdherents.map((adherent, index) => (
                  <button
                    key={adherent.id_adherent}
                    type="button"
                    role="option"
                    aria-selected={selectedAdherentId === String(adherent.id_adherent)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlightedAdherentIndex(index)}
                    onClick={() => selectAdherent(adherent)}
                    className={`block w-full px-4 py-3 text-left border-b border-slate-100 last:border-0 transition ${index === highlightedAdherentIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="block text-sm font-bold text-slate-800">{adherent.nom} {adherent.prenoms}</span>
                    <span className="block mt-0.5 text-xs font-mono text-[#2b529f]">{adherent.matricule}</span>
                  </button>
                ))}
                {filteredAdherents.length === 50 && (
                  <p className="px-4 py-2 text-xs text-center text-slate-400 bg-slate-50">Affinez la saisie pour réduire les résultats.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cotisation trimestrielle (readonly) */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
            Cotisation trimestrielle
          </label>
          <div className="relative">
            {isLoadingInfo && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            <input
              readOnly
              value={cotisationEs !== null ? formatFCFA(cotisationEs) : ''}
              placeholder="Sélectionner un adhérent pour afficher"
              className="block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Montant versé */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
            Montant versé (FCFA) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="0"
            className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
          />
        </div>

        {/* Mode de versement */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
            Mode de versement <span className="text-rose-500">*</span>
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
          >
            {MODES_VERSEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
            Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
          />
        </div>

        {mode === 'CHEQUE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="sm:col-span-2 text-xs text-amber-800">
              Le cheque reste en attente. La cotisation sera creditee apres compensation bancaire.
            </p>
            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Numero du cheque *</label>
              <input value={numeroCheque} onChange={(e) => setNumeroCheque(e.target.value)} required className="block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Banque emettrice *</label>
              <input value={banqueEmettrice} onChange={(e) => setBanqueEmettrice(e.target.value)} required className="block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Titulaire *</label>
              <input value={titulaireCheque} onChange={(e) => setTitulaireCheque(e.target.value)} required className="block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Date d'emission *</label>
              <input type="date" value={dateEmissionCheque} onChange={(e) => setDateEmissionCheque(e.target.value)} required className="block w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-semibold transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#2b529f] text-white rounded-xl hover:bg-[#1c3e7b] text-sm font-semibold transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === 'CHEQUE' ? 'Enregistrer pour validation' : 'Valider'}
          </button>
        </div>
      </form>

      {recuData && (
        <RecuVersement open onClose={() => setRecuData(null)} data={recuData} />
      )}
    </div>
  );
}
