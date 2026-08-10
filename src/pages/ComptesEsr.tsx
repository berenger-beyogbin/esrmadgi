import React, { useEffect, useState } from 'react';
import { compteEsrService } from '../services/compteEsrService';
import { VCompteEsrDetails, DBUser } from '../types';
import { ChevronLeft, ChevronRight, Eye, Search, Landmark, Calculator, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface ComptesEsrProps {
  currentUser: DBUser;
}

const COMPTES_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function ComptesEsr({ currentUser }: ComptesEsrProps) {
  const [comptes, setComptes] = useState<VCompteEsrDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchComptes = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await compteEsrService.getComptesEsr({
        search: search.trim() || undefined,
      });
      if (error) throw error;
      setComptes(data || []);
      setCurrentPage(1);
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

  const openFicheAdherent = (compte: VCompteEsrDetails) => {
    const adherentId = String(compte.id_adherent ?? compte.adherent_id ?? '');
    if (!adherentId) {
      setErrorMsg("Impossible d'ouvrir la fiche : identifiant adhérent manquant.");
      return;
    }
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('fiche-adherent', adherentId);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  const totalPages = Math.max(1, Math.ceil(comptes.length / rowsPerPage));
  const paginatedComptes = comptes.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
        <ScrollableTableWrapper maxHeight="none">
          <table className="rtable w-full table-fixed divide-y divide-slate-100 text-left text-xs" id="tbl-comptes-esr">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[19%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[15%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-[11px] leading-tight [&_th]:whitespace-normal [&_th]:break-words [&_th]:px-2 [&_th]:py-3">
              <tr>
                <th className="py-3.5 px-4">Matricule</th>
                <th className="py-3.5 px-4">Nom & Prénoms</th>
                <th className="py-3.5 px-4 text-right">Primes payées (pp)</th>
                <th className="py-3.5 px-4 text-right">Capital acquis</th>
                <th className="py-3.5 px-4 text-right">Provision math. (pm)</th>
                <th className="py-3.5 px-4 text-right">Valeur de rachat</th>
                <th className="py-3.5 px-4 text-center">Date calcul</th>
                <th className="py-3.5 px-2 text-center">Voir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700 [&_td]:break-words [&_td]:px-2">
              {paginatedComptes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/55 transition-colors">
                  <td data-label="Matricule" className="py-4 px-4 font-bold text-slate-800 font-mono tracking-wide">
                    {c.matricule}
                  </td>
                  <td data-label="Nom & Prénoms" className="py-4 px-4 font-semibold uppercase text-slate-800">
                    {c.nom} {c.prenoms}
                  </td>
                  <td data-label="Primes payées (pp)" className="py-4 px-4 text-right font-mono text-slate-600">
                    {formatFCFA(c.pp || 0)}
                  </td>
                  <td data-label="Capital acquis" className="py-4 px-4 text-right font-bold font-mono text-teal-700">
                    {formatFCFA(c.capital_acquis || 0)}
                  </td>
                  <td data-label="Provision math. (pm)" className="py-4 px-4 text-right font-bold font-mono text-indigo-700">
                    {formatFCFA(c.pm || 0)}
                  </td>
                  <td data-label="Valeur de rachat" className="py-4 px-4 text-right font-bold font-mono text-amber-700">
                    {formatFCFA(c.valeur_rachat || 0)}
                  </td>
                  <td data-label="Date calcul" className="py-4 px-4 text-center">
                    <p className="font-semibold text-slate-600 font-mono text-xs">{formatDateFr(c.date_calcul)}</p>
                  </td>
                  <td data-label="Voir" className="py-4 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => openFicheAdherent(c)}
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-blue-200 bg-blue-50 text-[#2b529f] hover:bg-[#2b529f] hover:text-white transition"
                      title={`Voir la fiche de ${c.nom} ${c.prenoms}`}
                      aria-label={`Voir la fiche individuelle de ${c.nom} ${c.prenoms} dans un nouvel onglet`}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/70">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <p className="text-xs font-semibold text-slate-500">
                Affichage {(currentPage - 1) * rowsPerPage + 1} à{' '}
                {Math.min(currentPage * rowsPerPage, comptes.length)} sur {comptes.length} comptes
              </p>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                Lignes par page
                <select
                  value={rowsPerPage}
                  onChange={(event) => {
                    setRowsPerPage(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2b529f]"
                  aria-label="Nombre de comptes par page"
                >
                  {COMPTES_PER_PAGE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2" aria-label="Pagination des comptes individuels">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-24 text-center text-xs font-bold text-slate-600">
                Page {currentPage} sur {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </ScrollableTableWrapper>
      )}
    </div>
  );
}
