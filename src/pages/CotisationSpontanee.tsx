import React, { useEffect, useState } from 'react';
import { cotisationService } from '../services/cotisationService';
import { VAdherentComplet } from '../types';
import { ArrowLeft, Loader2, AlertTriangle, CheckCircle2, Save } from 'lucide-react';

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
  const [cotisationEs, setCotisationEs] = useState<number | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState(MODES_VERSEMENT[0]);
  const [date, setDate] = useState(todayISO);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const resetForm = () => {
    setSelectedAdherentId('');
    setCotisationEs(null);
    setMontant('');
    setMode(MODES_VERSEMENT[0]);
    setDate(todayISO());
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

    const adherent = adherents.find((a) => a.id_adherent === Number(selectedAdherentId));
    if (!adherent) return;

    setIsSubmitting(true);
    const { error: createError } = await cotisationService.createCotisationSpontanee({
      id_adherent: selectedAdherentId,
      matricule: adherent.matricule,
      mode,
      date,
      montant: Number(montant),
    });

    if (createError) {
      setError(createError.message || JSON.stringify(createError));
      setIsSubmitting(false);
      return;
    }

    setSuccessMsg('Cotisation spontanée enregistrée avec succès.');
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
          <select
            value={selectedAdherentId}
            onChange={(e) => handleAdherentChange(e.target.value)}
            className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
          >
            <option value="">— Sélectionner un adhérent —</option>
            {adherents.map((a) => (
              <option key={a.id_adherent} value={a.id_adherent}>
                {a.matricule} — {a.nom} {a.prenoms}
              </option>
            ))}
          </select>
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
            Valider
          </button>
        </div>
      </form>
    </div>
  );
}
