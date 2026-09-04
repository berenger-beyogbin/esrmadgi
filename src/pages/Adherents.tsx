import React, { useState, useEffect, useRef } from 'react';
import { adherentService } from '../services/adherentService';
import { VAdherentComplet, DBUser, AuditLog, AdherentFilterOptions } from '../types';
import AdherentForm from '../components/AdherentForm';
import { ErrorBoundary } from '../components/ErrorBoundary';
import BeneficiairesList from '../components/BeneficiairesList';
import PromoRetraiteExistantsModal from '../components/PromoRetraiteExistantsModal';
import { Search, Plus, Edit2, Eye, UserPlus, Milestone, Filter, RefreshCw, Calendar, Mail, Phone, Users, ShieldAlert, KeyRound, Power, ChevronLeft, ChevronRight, RotateCcw, Gift } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

interface AdherentsProps {
  currentUser: DBUser;
}

type ViewState = 'LIST' | 'FORM' | 'DETAILS';
type StatutFilter = 'TOUS' | 'ACTIF' | 'RETRAITE' | 'DECEDE' | 'INACTIF';
interface AdherentListFilterState {
  search: string;
  statut: StatutFilter;
  dateInscription: string;
  direction: string;
  categorie: string;
  trimestrePremierPrecompte: string;
}
const DEFAULT_ADHERENTS_PER_PAGE = 6;
const ADHERENTS_PER_PAGE_OPTIONS = [6, 10, 20, 50];
const EMPTY_FILTER_OPTIONS: AdherentFilterOptions = {
  directions: [],
  categories: [],
  trimestresPremierPrecompte: [],
};

function formatTrimestrePremierPrecompte(value: string): string {
  const [annee, trimestre] = value.split('-');
  return trimestre && annee ? `${trimestre} ${annee}` : value;
}

export default function Adherents({ currentUser }: AdherentsProps) {
  const [adherents, setAdherents] = useState<VAdherentComplet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState<StatutFilter>('TOUS');
  const [dateInscriptionFilter, setDateInscriptionFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [categorieFilter, setCategorieFilter] = useState('');
  const [trimestrePrecompteFilter, setTrimestrePrecompteFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState<AdherentFilterOptions>(EMPTY_FILTER_OPTIONS);
  const fetchRequestId = useRef(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ADHERENTS_PER_PAGE);

  // Page Routing states
  const [viewState, setViewState] = useState<ViewState>('LIST');
  const [selectedAdherent, setSelectedAdherent] = useState<VAdherentComplet | null>(null);
  const [editingAdherent, setEditingAdherent] = useState<VAdherentComplet | null>(null); // null means CREATE
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [isLifecycleLoading, setIsLifecycleLoading] = useState(false);

  const [showPromoRetraiteModal, setShowPromoRetraiteModal] = useState(false);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [accessPassword, setAccessPassword] = useState('');
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPhone, setAccessPhone] = useState('');
  const [isAccessSubmitting, setIsAccessSubmitting] = useState(false);

  const fetchAdherents = async (override?: AdherentListFilterState) => {
    const requestId = ++fetchRequestId.current;
    const activeFilters = override ?? {
      search,
      statut: statutFilter,
      dateInscription: dateInscriptionFilter,
      direction: directionFilter,
      categorie: categorieFilter,
      trimestrePremierPrecompte: trimestrePrecompteFilter,
    };
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await adherentService.getAdherents({
        search: activeFilters.search.trim() || undefined,
        statut: activeFilters.statut !== 'TOUS' ? activeFilters.statut : undefined,
        dateInscription: activeFilters.dateInscription || undefined,
        direction: activeFilters.direction || undefined,
        categorie: activeFilters.categorie || undefined,
        trimestrePremierPrecompte: activeFilters.trimestrePremierPrecompte || undefined,
      });

      if (error) throw error;
      if (requestId !== fetchRequestId.current) return;
      setAdherents(data || []);
      setCurrentPage(1);
    } catch (e: any) {
      if (requestId !== fetchRequestId.current) return;
      console.error(e);
      setErrorMsg(typeof e === 'string' ? e : (e?.message ?? 'Erreur de récupération des adhérents de la MADGI.'));
    } finally {
      if (requestId === fetchRequestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdherents();
  }, [statutFilter, dateInscriptionFilter, directionFilter, categorieFilter, trimestrePrecompteFilter]);

  useEffect(() => {
    let isActive = true;
    adherentService.getFilterOptions().then(({ data, error }) => {
      if (!isActive) return;
      if (error) {
        console.error(error);
        return;
      }
      if (data) setFilterOptions({ ...EMPTY_FILTER_OPTIONS, ...data });
    });
    return () => {
      isActive = false;
    };
  }, []);

  // Handle Search submit
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchAdherents();
    }
  };

  const handleResetFilters = () => {
    const hasStructuredFilters = statutFilter !== 'TOUS'
      || Boolean(dateInscriptionFilter)
      || Boolean(directionFilter)
      || Boolean(categorieFilter)
      || Boolean(trimestrePrecompteFilter);
    setSearch('');
    setStatutFilter('TOUS');
    setDateInscriptionFilter('');
    setDirectionFilter('');
    setCategorieFilter('');
    setTrimestrePrecompteFilter('');
    if (!hasStructuredFilters) {
      fetchAdherents({
        search: '',
        statut: 'TOUS',
        dateInscription: '',
        direction: '',
        categorie: '',
        trimestrePremierPrecompte: '',
      });
    }
  };

  const handleCreateNew = () => {
    // Only GESTIONNAIRE and ADMINISTRATEUR can create
    if (currentUser.role === 'ADHERENT') {
      alert('Seuls les gestionnaires et administrateurs d\'assurances peuvent inscrire un adhérent.');
      return;
    }
    setEditingAdherent(null);
    setViewState('FORM');
  };

  const handleEditClick = (ad: VAdherentComplet) => {
    if (currentUser.role === 'ADHERENT') {
      alert('Modification interdite aux comptes adhérents.');
      return;
    }
    setEditingAdherent(ad);
    setViewState('FORM');
  };

  const loadHistory = async (adherentId: string) => {
    setIsHistoryLoading(true);
    try {
      const { data } = await adherentService.getHistory(adherentId);
      setHistory(data || []);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDetailsClick = (ad: VAdherentComplet) => {
    setSelectedAdherent(ad);
    setActionMsg(null);
    setShowAccessForm(false);
    setAccessEmail(ad.email || '');
    setAccessPhone(ad.telephone || '');
    setAccessPassword('');
    loadHistory(ad.id);
    setViewState('DETAILS');
  };

  const handleSaveSuccess = () => {
    setViewState('LIST');
    fetchAdherents();
  };

  const handleLifecycle = async (action: 'ACTIVER' | 'DESACTIVER' | 'RETRAITE' | 'DECES') => {
    if (!selectedAdherent) return;

    const labels: Record<typeof action, string> = {
      ACTIVER: 'reactiver cet adherent',
      DESACTIVER: 'desactiver cet adherent',
      RETRAITE: 'marquer cet adherent comme retraite',
      DECES: 'declarer le deces de cet adherent',
    };
    if (!window.confirm(`Confirmez-vous l'action : ${labels[action]} ?`)) return;
    const motif = window.prompt('Motif ou commentaire de la decision :') || '';

    setIsLifecycleLoading(true);
    setActionMsg(null);
    try {
      const { data, error } = await adherentService.changeLifecycle(selectedAdherent.id, { action, motif });
      if (error) throw error;
      if (data) setSelectedAdherent(data);
      setActionMsg('Statut adherent mis a jour.');
      await fetchAdherents();
      await loadHistory(selectedAdherent.id);
    } catch (e: any) {
      setActionMsg(e?.message || 'Impossible de modifier le statut adherent.');
    } finally {
      setIsLifecycleLoading(false);
    }
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdherent) return;
    if (!isStrongPassword(accessPassword)) {
      setActionMsg(PASSWORD_POLICY_MESSAGE);
      return;
    }
    setIsAccessSubmitting(true);
    setActionMsg(null);
    try {
      const { error } = await adherentService.createLinkedAccess(selectedAdherent.id, {
        email: accessEmail.trim() || selectedAdherent.email,
        telephone: accessPhone.trim() || null,
        password: accessPassword,
      });
      if (error) throw error;
      setShowAccessForm(false);
      setAccessPassword('');
      setActionMsg('Acces utilisateur adherent cree ou repare.');
      await loadHistory(selectedAdherent.id);
    } catch (err: any) {
      setActionMsg(err?.message || 'Impossible de creer l acces utilisateur.');
    } finally {
      setIsAccessSubmitting(false);
    }
  };

  const formatAuditDate = (date: string) => {
    if (!date) return '-';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString('fr-FR');
  };

  const totalPages = Math.max(1, Math.ceil(adherents.length / rowsPerPage));
  const paginatedAdherents = adherents.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  return (
    <div className="space-y-6" id="adherents-main-container">
      {/* 1. LIST MODULE */}
      {viewState === 'LIST' && (
        <div className="space-y-6">
          {/* Section banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Registre des Adhérents ESR</h2>
              <p className="text-slate-600 text-sm mt-1">
                Recherche multicritères dans le registre des adhérents ESR.
              </p>
            </div>
            {currentUser.role !== 'ADHERENT' && (
              <div className="flex items-center gap-3">
                <button
                  id="btn-adherents-promo-retraite"
                  onClick={() => setShowPromoRetraiteModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold transition"
                >
                  <Gift className="w-4 h-4" />
                  Offre promo retraite
                </button>
                <button
                  id="btn-adherents-nouveau"
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Inscrire un Adhérent
                </button>
              </div>
            )}
          </div>

          <PromoRetraiteExistantsModal
            open={showPromoRetraiteModal}
            onClose={() => setShowPromoRetraiteModal(false)}
            onApplied={() => fetchAdherents()}
          />

          {/* Search bar & filter controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Search Input */}
              <div className="relative w-full lg:flex-1 lg:min-w-0">
                <input
                  id="input-adherent-search"
                  type="text"
                  placeholder="Rechercher par matricule, nom, prénom (Entrée)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto lg:flex-none justify-end">
                <label
                  htmlFor="select-filter-statut"
                  className="shrink-0 text-slate-500 text-sm font-semibold mr-1 flex items-center gap-1"
                >
                  <Filter className="w-3.5 h-3.5" />
                  Statut
                </label>
                <select
                  id="select-filter-statut"
                  value={statutFilter}
                  onChange={(event) => setStatutFilter(event.target.value as StatutFilter)}
                  className="shrink-0 min-w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                >
                  <option value="TOUS">Tous les statuts</option>
                  <option value="ACTIF">ACTIF</option>
                  <option value="RETRAITE">RETRAITE</option>
                  <option value="INACTIF">INACTIF</option>
                  <option value="DECEDE">DECEDE</option>
                </select>
                <button
                  id="btn-adherent-reset-filters"
                  type="button"
                  onClick={handleResetFilters}
                  className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-600 transition"
                  title="Réinitialiser tous les filtres"
                >
                  <RotateCcw className="w-4 h-4" />
                  Réinitialiser
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="space-y-1.5 text-sm font-semibold text-slate-600">
                <label htmlFor="input-filter-date-inscription">Date d'inscription</label>
                <input
                  id="input-filter-date-inscription"
                  type="date"
                  value={dateInscriptionFilter}
                  onChange={(event) => setDateInscriptionFilter(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <label className="space-y-1.5 text-sm font-semibold text-slate-600">
                <span>Direction / Ville</span>
                <select
                  id="select-filter-direction"
                  value={directionFilter}
                  onChange={(event) => setDirectionFilter(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Toutes les directions / villes</option>
                  {filterOptions.directions.map((direction) => (
                    <option key={direction} value={direction}>{direction}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-slate-600">
                <span>Catégorie</span>
                <select
                  id="select-filter-categorie"
                  value={categorieFilter}
                  onChange={(event) => setCategorieFilter(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Toutes les catégories</option>
                  {filterOptions.categories.map((categorie) => (
                    <option key={categorie} value={categorie}>{categorie}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-slate-600">
                <span>Trimestre du 1er précompte</span>
                <select
                  id="select-filter-trimestre-precompte"
                  value={trimestrePrecompteFilter}
                  onChange={(event) => setTrimestrePrecompteFilter(event.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Tous les trimestres</option>
                  {filterOptions.trimestresPremierPrecompte.map((trimestre) => (
                    <option key={trimestre} value={trimestre}>
                      {formatTrimestrePremierPrecompte(trimestre)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Table representing exponents */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 text-sm">Chargement du registre...</span>
            </div>
          ) : adherents.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-400 text-sm">Aucun adhérent ne correspond aux critères de recherche.</p>
              {currentUser.role !== 'ADHERENT' && (
                <button
                  onClick={handleCreateNew}
                  className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Créer le premier adhérent maintenant
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="rtable min-w-full divide-y divide-slate-100 text-sm text-left" id="tbl-adherents-complets">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">Matricule</th>
                    <th className="py-3.5 px-4">Adhérent</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4">Date d'effet</th>
                    <th className="py-3.5 px-4 text-right">Cotisation trimestrielle</th>
                    <th className="py-3.5 px-4 text-center">Trimestres</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedAdherents.map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td data-label="Matricule" className="py-4 px-4 font-bold text-slate-800 font-mono tracking-wide">
                        {ad.matricule}
                      </td>
                      <td data-label="Adhérent" className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-800 uppercase">
                            {ad.civilite} {ad.nom}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {ad.prenoms}
                          </p>
                        </div>
                      </td>
                      <td data-label="Grade" className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-slate-700">{ad.grade_code}</p>
                          <p className="text-slate-500 text-xs">{ad.grade_libelle || 'Grade non spécifié'}</p>
                        </div>
                      </td>
                      <td data-label="Statut" className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                          ad.decede === true
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : ad.retraite === true
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : (ad.statut === true || ad.statut === 'ACTIF')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ad.decede ? 'DECEDE' : ad.retraite ? 'RETRAITE' : (ad.statut === true || ad.statut === 'ACTIF') ? 'ACTIF' : String(ad.statut || 'INACTIF')}
                        </span>
                      </td>
                      <td data-label="Date d'effet" className="py-4 px-4 font-mono text-slate-600">
                        {formatDateFr(ad.date_effet)}
                      </td>
                      <td data-label="Cotisation trimestrielle" className="py-4 px-4 text-right font-bold text-slate-800 font-mono">
                        {formatFCFA(ad.cotisation_es)}
                      </td>
                      <td data-label="Trimestres" className="py-4 px-4 text-center font-semibold text-slate-600 font-mono">
                        {ad.nb_trimestre || 0}
                      </td>
                      <td data-label="Actions" className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            id={`btn-voir-adh-${ad.id}`}
                            onClick={() => handleDetailsClick(ad)}
                            className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-indigo-600 font-semibold inline-flex items-center gap-1 transition"
                            title="Voir la fiche détaillée"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Voir</span>
                          </button>
                          
                          {currentUser.role !== 'ADHERENT' && (
                            <button
                              id={`btn-edit-adh-${ad.id}`}
                              onClick={() => handleEditClick(ad)}
                              className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-slate-100 text-emerald-600 font-semibold inline-flex items-center gap-1 transition"
                              title="Modifier"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Modifier</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>

              {adherents.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/70">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Affichage {(currentPage - 1) * rowsPerPage + 1} à{' '}
                      {Math.min(currentPage * rowsPerPage, adherents.length)} sur {adherents.length} adhérents
                    </p>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                      Lignes par page
                      <select
                        value={rowsPerPage}
                        onChange={(event) => {
                          setRowsPerPage(Number(event.target.value));
                          setCurrentPage(1);
                        }}
                        className="h-9 px-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        aria-label="Nombre de lignes par page"
                      >
                        {ADHERENTS_PER_PAGE_OPTIONS.map((size) => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex items-center gap-1" aria-label="Pagination du registre des adhérents">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Page précédente"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-9 h-9 px-2 rounded-lg border text-sm font-bold transition ${
                          currentPage === page
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        aria-current={currentPage === page ? 'page' : undefined}
                      >
                        {page}
                      </button>
                    ))}
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
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. FORM MODULE (Create/Edit) */}
      {viewState === 'FORM' && (
        <ErrorBoundary fallbackLabel="Erreur dans le formulaire adhérent — voir le message ci-dessous.">
          <AdherentForm
            adherent={editingAdherent}
            onCancel={() => setViewState('LIST')}
            onSaveSuccess={handleSaveSuccess}
          />
        </ErrorBoundary>
      )}

      {/* 3. DETAILS MODULE */}
      {viewState === 'DETAILS' && selectedAdherent && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                id="btn-back-to-list-details"
                onClick={() => setViewState('LIST')}
                className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 text-sm font-semibold transition"
              >
                ← Retour au registre
              </button>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800">
                  Fiche ESR : {selectedAdherent.prenoms} {selectedAdherent.nom}
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Matricule : {selectedAdherent.matricule} — {selectedAdherent.decede ? 'DÉCÉDÉ' : selectedAdherent.retraite ? 'RETRAITÉ' : selectedAdherent.statut === true ? 'ACTIF' : selectedAdherent.statut || 'N/A'}
                </p>
              </div>
            </div>
            
            {currentUser.role !== 'ADHERENT' && (
              <button
                id="btn-edit-details"
                onClick={() => handleEditClick(selectedAdherent)}
                className="flex items-center gap-1 px-4 py-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Modifier la fiche
              </button>
            )}
          </div>

          {currentUser.role !== 'ADHERENT' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Actions de cycle de vie</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Gerer le statut administratif, l'acces utilisateur et la tracabilite de cette fiche.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAccessForm((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100"
                  >
                    <KeyRound className="w-4 h-4" />
                    Acces adherent
                  </button>
                  <button
                    type="button"
                    disabled={isLifecycleLoading}
                    onClick={() => handleLifecycle('ACTIVER')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Power className="w-4 h-4" />
                    Activer
                  </button>
                  <button
                    type="button"
                    disabled={isLifecycleLoading}
                    onClick={() => handleLifecycle('DESACTIVER')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Desactiver
                  </button>
                  <button
                    type="button"
                    disabled={isLifecycleLoading}
                    onClick={() => handleLifecycle('RETRAITE')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-200 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Milestone className="w-4 h-4" />
                    Retraite
                  </button>
                  <button
                    type="button"
                    disabled={isLifecycleLoading}
                    onClick={() => handleLifecycle('DECES')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 disabled:opacity-50"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Deces
                  </button>
                </div>
              </div>

              {showAccessForm && (
                <form onSubmit={handleCreateAccess} className="grid grid-cols-1 md:grid-cols-4 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email de connexion</label>
                    <input
                      type="email"
                      value={accessEmail}
                      onChange={(e) => setAccessEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telephone</label>
                    <input
                      value={accessPhone}
                      onChange={(e) => setAccessPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe</label>
                    <input
                      type="password"
                      minLength={8}
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700"
                      required
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isAccessSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      {isAccessSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Creer l'acces
                    </button>
                  </div>
                </form>
              )}

              {actionMsg && (
                <div className={`p-3 rounded-xl text-sm border ${
                  actionMsg.toLowerCase().includes('impossible')
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {actionMsg}
                </div>
              )}
            </div>
          )}

          {/* Sub-bento-grid display of details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Identity Info */}
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 md:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1">
                <span>Bloc Identité Civile</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Date de naissance</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{formatDateFr(selectedAdherent.date_naissance)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Lieu de naissance</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.lieu_naissance || '—'}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Situation conjugale</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.situation_matrimoniale}</p>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Téléphone portable</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.telephone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Adresse de courrier</p>
                    <p className="font-semibold text-slate-800 mt-0.5 break-all">{selectedAdherent.email}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Adresse géographique</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.adresse_geographique || '—'}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Adresse postale</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.adresse_postale || '—'}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Direction</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.direction || '—'}</p>
                  <p className="text-xs text-slate-500 font-semibold uppercase mt-3">Emploi</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedAdherent.emploi}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Date d'inscription</p>
                  <p className="font-semibold text-slate-850 mt-0.5 font-mono">{formatDateFr(selectedAdherent.date_souscription)}</p>
                </div>
              </div>
            </div>

            {/* Contract terms card */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm text-white space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono">
                Conditions du Contrat ESR
              </h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-slate-800 font-mono gap-4">
                  <span className="text-slate-400">N° de police</span>
                  <span className="font-bold text-emerald-400 text-right">{selectedAdherent.numero_police || '—'}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Classe / Grade</span>
                  <span className="font-bold text-slate-100">{selectedAdherent.grade_code}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Départ Retraite</span>
                  <span className="font-bold text-slate-100">{selectedAdherent.age_retraite} ans</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800 font-mono">
                  <span className="text-slate-400">Date Retraite</span>
                  <span className="font-bold text-slate-100">{formatDateFr(selectedAdherent.date_retraite)}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Trimestres acquis</span>
                  <span className="font-bold text-slate-100">{selectedAdherent.nb_trimestre}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-400">Cotisation trimestrielle</span>
                  <span className="font-bold text-emerald-400">{formatFCFA(selectedAdherent.cotisation_es)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Beneficiaries nested dashboard section as requested */}
          <BeneficiairesList
            adherent={selectedAdherent}
            onBack={() => setViewState('LIST')}
          />

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">Historique des changements</h3>
                <p className="text-xs text-slate-500 mt-1">Evenements enregistres pour cette fiche adherent.</p>
              </div>
              <button
                type="button"
                onClick={() => loadHistory(selectedAdherent.id)}
                disabled={isHistoryLoading}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 disabled:opacity-50"
                title="Actualiser l'historique"
              >
                <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Chargement de l'historique...
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Aucun changement journalise pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {history.map((log) => (
                  <div key={log.id || `${log.action}-${log.date}`} className="p-3 border border-slate-100 rounded-xl bg-slate-50/70 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-xs text-slate-500 font-mono">{formatAuditDate(log.date)}</span>
                    </div>
                    <p className="text-slate-600 mt-1">{log.details}</p>
                    <p className="text-xs text-slate-400 mt-1">Par : {log.utilisateur || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
