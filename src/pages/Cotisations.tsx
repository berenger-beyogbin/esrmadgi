import React, { useEffect, useState } from 'react';
import { cotisationService } from '../services/cotisationService';
import { VCotisationDetails, DBUser } from '../types';
import { Search, Filter, CalendarPlus, Landmark, FileSpreadsheet, RefreshCw, Eye, CheckCircle2, AlertCircle, Clock, Loader2, PlusCircle } from 'lucide-react';
import CotisationSpontanee from './CotisationSpontanee';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface CotisationsProps {
  currentUser: DBUser;
}

export default function Cotisations({ currentUser }: CotisationsProps) {
  const canManageCotisations =
    currentUser.role === 'GESTIONNAIRE' ||
    currentUser.role === 'ADMINISTRATEUR' ||
    currentUser.role === 'SUPERADMIN';
  const [showSpontanee, setShowSpontanee] = useState(false);
  const [cotisations, setCotisations] = useState<VCotisationDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [periodeFilter, setPeriodeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState<'TOUS' | 'VALIDE' | 'EN_COURS' | 'REJETE'>('TOUS');
  const [sourceFilter, setSourceFilter] = useState<'TOUS' | 'PRECOMPTE' | 'DIRECT' | 'SPONTANEE'>('TOUS');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Adherent detail history drill-down
  const [selectedAdherentId, setSelectedAdherentId] = useState<string | null>(null);
  const [adherentHistory, setAdherentHistory] = useState<VCotisationDetails[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedAdherentName, setSelectedAdherentName] = useState('');

  const fetchCotisations = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await cotisationService.getCotisations({
        search: search.trim() || undefined,
        periode: periodeFilter.trim() || undefined,
        statut: statutFilter !== 'TOUS' ? statutFilter : undefined,
        source: sourceFilter !== 'TOUS' ? sourceFilter : undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      });

      if (error) throw error;
      setCotisations(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || JSON.stringify(e) || 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCotisations();
  }, [periodeFilter, statutFilter, sourceFilter, dateDebut, dateFin]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchCotisations();
    }
  };

  const loadAdherentHistory = async (matricule: string | undefined, label: string) => {
    if (!matricule) {
      setErrorMsg('Matricule introuvable pour charger l\'historique.');
      return;
    }
    setSelectedAdherentId(matricule);
    setSelectedAdherentName(label);
    setIsLoadingHistory(true);
    try {
      const { data, error } = await cotisationService.getCotisationsByMatricule(matricule);
      if (error) throw error;
      setAdherentHistory(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const closeHistory = () => {
    setSelectedAdherentId(null);
    setAdherentHistory([]);
  };

  if (showSpontanee) {
    return <CotisationSpontanee onClose={() => setShowSpontanee(false)} />;
  }

  return (
    <div className="space-y-6" id="cotisations-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Registre des Versements & Cotisations</h2>
          <p className="text-slate-600 text-sm mt-1">
            Suivi analytique des échéances d'épargne et des versements ESR.
          </p>
        </div>
        {canManageCotisations && (
          <button
            onClick={() => setShowSpontanee(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2b529f] text-white rounded-xl hover:bg-[#1c3e7b] text-sm font-bold transition shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Cotisation spontanée
          </button>
        )}
      </div>

      {/* Filter and Tool Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 font-mono">Recherche Adhérent</label>
            <input
              id="input-cotis-search"
              type="text"
              placeholder="Matricule, nom, prénoms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-7" />
          </div>

          {/* Period Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 font-mono">Période (ex : 2026T2)</label>
            <input
              type="text"
              placeholder="Ex: 2026T2"
              value={periodeFilter}
              onChange={(e) => setPeriodeFilter(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
            />
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 font-mono">Origine / Canal</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="TOUS">Toutes les sources</option>
              <option value="PRECOMPTE">PRECOMPTE (Salaire)</option>
              <option value="SPONTANEE">SPONTANEE (Cotisation directe)</option>
              <option value="DIRECT">DIRECT (Banque)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 font-mono">Statut du Versement</label>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="TOUS">Tous les statuts</option>
              <option value="VALIDE">VALIDE</option>
              <option value="EN_COURS">EN COURS</option>
              <option value="REJETE">REJETE</option>
            </select>
          </div>

          {/* Date début */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 font-mono">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>

          {/* Date fin */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 font-mono">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Clear/Refresh buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            id="btn-cotis-refresh"
            onClick={fetchCotisations}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-slate-600 text-sm font-semibold transition"
          >
            <RefreshCw className="w-3 h-3" />
            Actualiser les filtres
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* COTISATIONS LIST */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-sm font-medium">Recherche de flux bancaires...</span>
        </div>
      ) : cotisations.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-sm">Aucune cotisation trouvée.</p>
        </div>
      ) : (
        <ScrollableTableWrapper>
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left text-slate-700" id="tbl-cotisations-details">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
              <tr>
                <th className="py-3.5 px-4">Adhérent</th>
                <th className="py-3.5 px-4 text-center">Matricule</th>
                <th className="py-3.5 px-4">Période</th>
                <th className="py-3.5 px-4 text-center">Date valeur</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Montant</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {cotisations.map((cot) => (
                <tr key={cot.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800 uppercase">
                    {cot.nom} {cot.prenoms}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-mono">
                    {cot.matricule}
                  </td>
                  <td className="py-3.5 px-4 font-semibold font-mono text-slate-600">
                    {cot.periode}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                    {formatDateFr(cot.date_valeur || cot.date_cotisation || '')}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">
                    <span className={`px-2.5 py-1 rounded text-xs ${
                      cot.source === 'PRECOMPTE'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {cot.source || '-'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 text-sm">
                    {cot.mode || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs ${
                      cot.statut === 'VALIDE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : cot.statut === 'EN_COURS'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-700'
                    }`}>
                      {cot.statut === 'VALIDE' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {cot.statut === 'EN_COURS' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                      {cot.statut === 'REJETE' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                      {cot.statut}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold font-mono text-slate-800">
                    {formatFCFA(cot.montant)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      id={`btn-voir-cotis-${cot.id}`}
                      onClick={() => loadAdherentHistory(cot.matricule, `${cot.prenoms} ${cot.nom} (${cot.matricule})`)}
                      className="p-1 px-2 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-emerald-600 font-semibold inline-flex items-center gap-1 transition text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Historique</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableWrapper>
      )}

      {/* DRILL-DOWN MODAL FOR MEMBER CONTRIBUTION LOGS */}
      {selectedAdherentId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-4 backdrop-blur-sm" id="modal-drilldown-cotisations">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Historique des cotisations ESR</h3>
                <p className="text-sm text-slate-500 mt-1">Adhérent de la MADGI : <span className="font-bold text-emerald-600">{selectedAdherentName}</span></p>
              </div>
              <button
                id="btn-close-cotis-modal"
                onClick={closeHistory}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                ✕
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center py-12 flex-1">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 border border-slate-100 rounded-xl">
                <table className="min-w-full divide-y divide-slate-100 text-sm text-left" id="tbl-history-adherent">
                  <thead className="bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
                    <tr>
                      <th className="py-3.5 px-4">Période</th>
                      <th className="py-3.5 px-4">Date valeur</th>
                      <th className="py-3.5 px-4">Source</th>
                      <th className="py-3.5 px-4">Mode</th>
                      <th className="py-3.5 px-4">Statut</th>
                      <th className="py-3.5 px-4 text-right">Montant versé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {adherentHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">Aucune cotisation enregistrée pour cet adhérent.</td>
                      </tr>
                    ) : (
                      adherentHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold font-mono text-slate-800">{h.periode}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{formatDateFr(h.date_valeur || h.date_cotisation || '')}</td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{h.source || '-'}</td>
                          <td className="py-3 px-4 text-slate-600 text-sm">{h.mode || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              h.statut === 'VALIDE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {h.statut}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold font-mono text-slate-800">{formatFCFA(h.montant)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="btn-close-cotis-modal-bottom"
                onClick={closeHistory}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
