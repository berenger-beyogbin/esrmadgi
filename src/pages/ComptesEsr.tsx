import React, { useEffect, useState } from 'react';
import { compteEsrService } from '../services/compteEsrService';
import { VCompteEsrDetails, DBUser } from '../types';
import { Search, Info, Landmark, Calculator, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface ComptesEsrProps {
  currentUser: DBUser;
}

export default function ComptesEsr({ currentUser }: ComptesEsrProps) {
  const [comptes, setComptes] = useState<VCompteEsrDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchComptes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await compteEsrService.getComptesEsr({
        search: search.trim() || undefined,
      });
      if (error) throw error;
      setComptes(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur de chargement des comptes individuels.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComptes();
  }, []);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchComptes();
    }
  };

  const handleAvisAnnuel = async (compte: VCompteEsrDetails) => {
    const anneeParDefaut = new Date().getFullYear() - 1;
    const saisie = window.prompt("Annee de l'avis annuel cloture :", String(anneeParDefaut));
    if (saisie == null) return;
    const annee = Number(saisie);
    if (!Number.isInteger(annee) || annee < 2020 || annee > new Date().getFullYear()) {
      setErrorMsg("L'annee de l'avis annuel est invalide.");
      return;
    }
    const { data, error } = await compteEsrService.telechargerAvisAnnuel(compte.adherent_id, annee);
    if (error || !data) {
      setErrorMsg(error?.message || 'Avis annuel indisponible.');
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `avis-annuel-esr-${compte.matricule}-${annee}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="comptes-esr-container">
      {/* Portlet Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Comptes Individuels Épargne Santé Retraite</h2>
          <p className="text-slate-500 text-xs mt-1">
            Suivi des comptes individuels et des provisions collectives.
          </p>
        </div>
      </div>

      {/* Filter and controls bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <input
            id="input-comptes-search"
            type="text"
            placeholder="Rechercher par matricule, nom, prénoms (Pressez Entrée)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        <button
          id="btn-refresh-comptes"
          onClick={fetchComptes}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl" id="comptes-error">
          {errorMsg}
        </div>
      )}

      {/* Main accounts list block */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-xs font-medium">Calcul et consolidation des comptes...</span>
        </div>
      ) : comptes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-md">
          <p className="text-slate-400 text-xs">Aucun compte trouvé correspondant aux critères de recherche.</p>
        </div>
      ) : (
        <ScrollableTableWrapper>
          <table className="w-full table-fixed divide-y divide-slate-100 text-left text-xs" id="tbl-comptes-esr">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[18%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-[11px] leading-tight [&_th]:whitespace-normal [&_th]:break-words [&_th]:px-2 [&_th]:py-3">
              <tr>
                <th className="py-3.5 px-4">Matricule</th>
                <th className="py-3.5 px-4">Nom & Prénoms</th>
                <th className="py-3.5 px-4 text-right">Primes payées (pp)</th>
                <th className="py-3.5 px-4 text-right">Part unique (pu)</th>
                <th className="py-3.5 px-4 text-right">Capital acquis</th>
                <th className="py-3.5 px-4 text-right">Provision math. (pm)</th>
                <th className="py-3.5 px-4 text-right">Valeur de rachat</th>
                <th className="py-3.5 px-4 text-center">Date calcul / Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700 [&_td]:break-words [&_td]:px-2">
              {comptes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/55 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-800 font-mono tracking-wide">
                    {c.matricule}
                  </td>
                  <td className="py-4 px-4 font-semibold uppercase text-slate-800">
                    {c.nom} {c.prenoms}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-slate-600">
                    {formatFCFA(c.pp || 0)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-slate-600">
                    {formatFCFA(c.pu || 0)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold font-mono text-teal-700">
                    {formatFCFA(c.capital_acquis || 0)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold font-mono text-indigo-700">
                    {formatFCFA(c.pm || 0)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold font-mono text-amber-700">
                    {formatFCFA(c.valeur_rachat || 0)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div>
                      <p className="font-semibold text-slate-600 font-mono text-xs">{formatDateFr(c.date_calcul)}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">v.{c.version_calc || '1.0'}</p>
                      <button
                        onClick={() => handleAvisAnnuel(c)}
                        className="mt-2 px-2 py-1 bg-slate-800 text-white rounded text-[9px] font-bold"
                      >
                        Avis annuel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableWrapper>
      )}

      {/* Informative actuarial footnotes */}
      <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-5 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Spécificité Légale des Provisions Mathématiques :</p>
          <p className="text-amber-800 leading-relaxed font-light">
            La provision mathématique correspond aux cotisations encaissées, capitalisées selon le taux technique en vigueur et leurs dates de valeur. Elle est actualisée à chaque fin de période de précompte. La table de mortalité CIMA F intervient ensuite dans les calculs viagers liés à la rente santé.
          </p>
        </div>
      </div>
    </div>
  );
}
