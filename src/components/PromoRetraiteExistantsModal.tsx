import React, { useEffect, useState } from 'react';
import { X, Loader2, Gift, CheckCircle2 } from 'lucide-react';
import { adherentService } from '../services/adherentService';
import { AdherentEligiblePromo } from '../types';
import { formatFCFA } from '../utils/formatters';

interface PromoRetraiteExistantsModalProps {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}

export default function PromoRetraiteExistantsModal({ open, onClose, onApplied }: PromoRetraiteExistantsModalProps) {
  const [eligibles, setEligibles] = useState<AdherentEligiblePromo[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadEligibles = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const { data, error } = await adherentService.getPromoRetraiteEligibles();
    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setEligibles(data);
    setSelected(new Set(data.map((row) => row.id_adherent)));
  };

  useEffect(() => {
    if (!open) return;
    setSuccessMsg(null);
    loadEligibles();
  }, [open]);

  if (!open) return null;

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === eligibles.length ? new Set() : new Set(eligibles.map((row) => row.id_adherent))));
  };

  const handleApply = async () => {
    if (selected.size === 0) return;
    setIsApplying(true);
    setErrorMsg(null);
    const { data, error } = await adherentService.appliquerPromoRetraite(Array.from(selected));
    setIsApplying(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    const count = data?.appliques.length ?? 0;
    setSuccessMsg(`Offre appliquée à ${count} adhérent(s).`);
    onApplied?.();
    await loadEligibles();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#2b529f] px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Offre promotionnelle départ retraite — adhérents existants
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-slate-600">
            Adhérents actifs à moins de 5 ans de la retraite, éligibles au barème du CA, n'ayant pas encore reçu l'offre.
            L'abattement réduit uniquement la cotisation trimestrielle affichée ci-dessous ; le capital constitutif et les
            autres termes du contrat ne sont pas modifiés.
          </p>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-semibold">{errorMsg}</div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : eligibles.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
              Aucun adhérent existant n'est actuellement éligible à l'offre.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.size === eligibles.length && eligibles.length > 0}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="p-3 text-left">Matricule</th>
                    <th className="p-3 text-left">Adhérent</th>
                    <th className="p-3 text-left">Grade</th>
                    <th className="p-3 text-right">Trimestres restants</th>
                    <th className="p-3 text-right">Abattement</th>
                    <th className="p-3 text-right">Cotisation actuelle</th>
                    <th className="p-3 text-right">Cotisation après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {eligibles.map((row) => (
                    <tr key={row.id_adherent} className="hover:bg-slate-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(row.id_adherent)}
                          onChange={() => toggleOne(row.id_adherent)}
                        />
                      </td>
                      <td className="p-3 font-mono">{row.matricule}</td>
                      <td className="p-3">{row.nom} {row.prenoms}</td>
                      <td className="p-3">{row.grade}</td>
                      <td className="p-3 text-right">{row.nb_trimestre_restant} T</td>
                      <td className="p-3 text-right font-semibold text-emerald-700">-{row.taux_abattement_promo}%</td>
                      <td className="p-3 text-right text-slate-500">{formatFCFA(row.cotisation_es_avant_abattement)}</td>
                      <td className="p-3 text-right font-bold text-slate-800">{formatFCFA(row.cotisation_es_apres_abattement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-sm text-slate-500">{selected.size} sélectionné(s) sur {eligibles.length}</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Fermer
            </button>
            <button
              onClick={handleApply}
              disabled={selected.size === 0 || isApplying}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
            >
              {isApplying && <Loader2 className="w-4 h-4 animate-spin" />}
              Appliquer l'abattement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
