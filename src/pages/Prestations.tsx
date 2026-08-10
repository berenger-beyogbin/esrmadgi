import React, { useEffect, useState } from 'react';
import { prestationService } from '../services/prestationService';
import { adherentService } from '../services/adherentService';
import { EcheanceAps, VPrestationDetails, RenreDetails, RenteVersement, VAdherentComplet, DBUser } from '../types';
import { Wallet, Plus, Award, RefreshCw, Calendar, FileText, CheckCircle2, RotateCw, Activity, HeartCrack, ChevronRight, HelpCircle } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface PrestationsProps {
  currentUser: DBUser;
}

type TabType = 'PRESTATIONS' | 'RENTES' | 'ECHEANCES_APS';

export default function Prestations({ currentUser }: PrestationsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('PRESTATIONS');
  
  // Tab 1: Prestations States
  const [prestations, setPrestations] = useState<VPrestationDetails[]>([]);
  const [adherents, setAdherents] = useState<VAdherentComplet[]>([]);
  const [isLoadingPres, setIsLoadingPres] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDossierForm, setShowDossierForm] = useState(false);
  
  // Form values
  const [formData, setFormData] = useState({
    adherent_id: '',
    type_prestation: 'RETRAITE',
    statut_prestation: 'DOSSIER_OUVERT',
    date_demande: new Date().toISOString().split('T')[0],
  });

  // Tab 2: Rentes States
  const [rentes, setRentes] = useState<RenreDetails[]>([]);
  const [isLoadingRentes, setIsLoadingRentes] = useState(true);
  const [selectedRente, setSelectedRente] = useState<RenreDetails | null>(null);
  const [versements, setVersements] = useState<RenteVersement[]>([]);
  const [isLoadingVersements, setIsLoadingVersements] = useState(false);
  const maintenant = new Date();
  const [anneeEcheances, setAnneeEcheances] = useState(maintenant.getFullYear());
  const [trimestreEcheances, setTrimestreEcheances] = useState(Math.floor(maintenant.getMonth() / 3) + 1);
  const [echeances, setEcheances] = useState<EcheanceAps[]>([]);
  const [isLoadingEcheances, setIsLoadingEcheances] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load basic lists
  const loadPrestationTab = async () => {
    setIsLoadingPres(true);
    setErrorMsg(null);
    try {
      const { data, error } = await prestationService.getPrestations();
      if (error) throw error;
      setPrestations(data || []);

      const { data: adList } = await adherentService.getAdherents();
      setAdherents(adList || []);
      if (adList && adList.length > 0) {
        setFormData(prev => ({ ...prev, adherent_id: adList[0].id }));
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur de chargement des dossiers de prestations.');
    } finally {
      setIsLoadingPres(false);
    }
  };

  const loadRentesTab = async () => {
    setIsLoadingRentes(true);
    setErrorMsg(null);
    try {
      const { data, error } = await prestationService.getRentes();
      if (error) throw error;
      setRentes(data || []);
      
      if (data && data.length > 0) {
        // Select first automatically to populate versements details as requested
        loadRenteVersements(data[0]);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur de chargement des rentes de retraite.');
    } finally {
      setIsLoadingRentes(false);
    }
  };

  const loadRenteVersements = async (r: RenreDetails) => {
    setSelectedRente(r);
    setIsLoadingVersements(true);
    try {
      const { data, error } = await prestationService.getRenteVersements(r.id);
      if (error) throw error;
      setVersements(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoadingVersements(false);
    }
  };

  const loadEcheances = async () => {
    setIsLoadingEcheances(true);
    setErrorMsg(null);
    const { data, error } = await prestationService.getEcheances({
      annee: anneeEcheances, trimestre: trimestreEcheances,
    });
    if (error) setErrorMsg(error.message);
    setEcheances(data);
    setIsLoadingEcheances(false);
  };

  useEffect(() => {
    if (activeTab === 'PRESTATIONS') {
      loadPrestationTab();
    } else if (activeTab === 'RENTES') {
      loadRentesTab();
    } else {
      loadEcheances();
    }
  }, [activeTab, anneeEcheances, trimestreEcheances]);

  const handleGenererEcheances = async () => {
    setIsSubmitting(true);
    const { data, error } = await prestationService.genererEcheances(anneeEcheances, trimestreEcheances);
    setIsSubmitting(false);
    if (error) return setErrorMsg(error.message);
    setErrorMsg(data ? `${data.creees} échéance(s) créée(s) sur ${data.eligibles} rente(s) éligible(s).` : null);
    await loadEcheances();
  };

  const handleAvancerEcheance = async (e: EcheanceAps) => {
    if (!e.statut) return;
    if (e.statut === 'VALIDEE') {
      const referencePaiement = window.prompt('Référence du paiement APS :');
      if (!referencePaiement) return;
      const { error } = await prestationService.payerEcheance(e.id, {
        datePaiement: new Date().toISOString().slice(0, 10), referencePaiement, modePaiement: 'VIREMENT',
      });
      if (error) setErrorMsg(error.message); else await loadEcheances();
      return;
    }
    const suivant = e.statut === 'GENEREE' ? 'EN_CONTROLE' : e.statut === 'EN_CONTROLE' ? 'VALIDEE' : null;
    if (!suivant) return;
    const { error } = await prestationService.changerStatutEcheance(e.id, suivant);
    if (error) setErrorMsg(error.message); else await loadEcheances();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adherent_id) {
      setErrorMsg('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await prestationService.createPrestation({
        adherent_id: formData.adherent_id,
        type_prestation: formData.type_prestation,
        statut_prestation: formData.statut_prestation,
        date_demande: formData.date_demande,
      });

      if (error) throw error;

      setShowDossierForm(false);
      await loadPrestationTab();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Impossible de créer le dossier de prestation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadLiquidation = async (prestation: VPrestationDetails) => {
    setErrorMsg(null);
    const { data, error } = await prestationService.telechargerLiquidation(prestation.id);
    if (error || !data) {
      setErrorMsg(error?.message || 'Fiche de liquidation indisponible.');
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liquidation-${prestation.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleNextStatut = async (prestation: VPrestationDetails) => {
    const suivant = prestation.statut_prestation === 'DOSSIER_OUVERT'
      ? 'EN_CONTROLE'
      : prestation.statut_prestation === 'EN_CONTROLE'
        ? 'VALIDE'
        : prestation.statut_prestation === 'VALIDE'
          ? 'PAYE'
          : null;
    if (!suivant) return;
    setErrorMsg(null);
    const { error } = await prestationService.changerStatut(prestation.id, suivant);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await loadPrestationTab();
  };

  return (
    <div className="space-y-6" id="prestations-module-root">
      {/* Tab select bar */}
      <div className="flex border-b border-slate-200">
        <button
          id="tab-btn-prestations"
          onClick={() => setActiveTab('PRESTATIONS')}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
            activeTab === 'PRESTATIONS'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Dossiers de Prestations
        </button>
        <button
          id="tab-btn-rentes"
          onClick={() => setActiveTab('RENTES')}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
            activeTab === 'RENTES'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Liquidation & Rentes viagères
        </button>
        <button
          onClick={() => setActiveTab('ECHEANCES_APS')}
          className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
            activeTab === 'ECHEANCES_APS'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Échéances APS
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-850 text-xs rounded-xl" id="pres-error-alert">
          {errorMsg}
        </div>
      )}

      {/* TAB 1: PRESTATIONS */}
      {activeTab === 'PRESTATIONS' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registre des Dossiers de Prestations</h2>
              <p className="text-slate-500 text-xs mt-1">
                Suivi des dossiers de prestations et des liquidations de capital.
              </p>
            </div>
            {currentUser.role !== 'ADHERENT' && !showDossierForm && (
              <button
                id="btn-show-pres-form"
                onClick={() => setShowDossierForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold tracking-wide transition"
              >
                <Plus className="w-4 h-4" />
                Créer un dossier de prestation
              </button>
            )}
          </div>

          {/* Creation form */}
          {showDossierForm && (
            <div className="bg-white rounded-2xl border border-slate-250 shadow-lg p-6 max-w-xl mx-auto" id="pres-form-container">
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="font-extrabold text-slate-850 text-sm">Ouvrir un Dossier de Prestation</h3>
                <p className="text-slate-400 text-xs">Examen des droits acquis d'un adhérent suite à une échéance contractuelle ou accident.</p>
              </div>

              <form onSubmit={handleCreateDossier} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Adhérent selection */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Assuré concerné</label>
                  <select
                    name="adherent_id"
                    required
                    value={formData.adherent_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-705 font-medium"
                  >
                    <option value="">-- Sélectionner l'assuré --</option>
                    {adherents.map(ad => (
                      <option key={ad.id} value={ad.id}>
                        {ad.matricule} — {ad.nom} {ad.prenoms}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type de prestation */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Type événement</label>
                  <select
                    name="type_prestation"
                    value={formData.type_prestation}
                    onChange={handleInputChange}
                    className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold"
                  >
                    <option value="RETRAITE">RETRAITE (Départ normal)</option>
                    <option value="DECES">DECES (Prestation Ayants droit)</option>
                    <option value="INVALIDITE">INVALIDITE ACCIDENTELLE</option>
                  </select>
                </div>

                {/* Statut prestation */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Statut dossier initial</label>
                  <select
                    name="statut_prestation"
                    value={formData.statut_prestation}
                    onChange={handleInputChange}
                    className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold"
                  >
                    <option value="DOSSIER_OUVERT">DOSSIER OUVERT</option>
                    <option value="EN_CONTROLE">EN CONTROLE</option>
                    <option value="VALIDE">VALIDE</option>
                    <option value="PAYE">PAYE</option>
                  </select>
                </div>

                {/* Date demande */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono">Date de dépôt</label>
                  <input
                    type="date"
                    name="date_demande"
                    required
                    value={formData.date_demande}
                    onChange={handleInputChange}
                    className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono"
                  />
                </div>

                <div className="sm:col-span-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                  Le montant sera calculé automatiquement depuis les cotisations encaissées,
                  le compte ESR et les paramètres applicables à la date de dépôt.
                </div>

                {/* Action buttons */}
                <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    id="btn-pres-form-cancel"
                    type="button"
                    onClick={() => setShowDossierForm(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    id="btn-pres-form-submit"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition"
                  >
                    {isSubmitting ? 'Publication...' : 'Enregistrer le dossier'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Prestations Table list */}
          {isLoadingPres ? (
            <div className="flex justify-center py-12 bg-white rounded-2xl border border-slate-100 shadow">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : prestations.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-400 text-xs">Aucun dossier de prestation enregistré pour le moment.</p>
            </div>
          ) : (
            <ScrollableTableWrapper>
              <table className="rtable min-w-full divide-y divide-slate-100 text-sm text-left" id="tbl-prestations-details">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">Adhérent</th>
                    <th className="py-3.5 px-4 text-center">Matricule</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4 text-center">Date demande</th>
                    <th className="py-3.5 px-4">Statut</th>
                    <th className="py-3.5 px-4 text-right">Montant</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {prestations.map(p => (
                    <tr key={p.id} className="hover:bg-slate-55/40 transition">
                      <td data-label="Adhérent" className="py-3.5 px-4 font-bold text-slate-800 uppercase">
                        {p.nom} {p.prenoms}
                      </td>
                      <td data-label="Matricule" className="py-3.5 px-4 text-center font-bold text-slate-705 font-mono">
                        {p.matricule}
                      </td>
                      <td data-label="Type" className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                          p.type_prestation === 'RETRAITE'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : p.type_prestation === 'DECES'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {p.type_prestation}
                        </span>
                      </td>
                      <td data-label="Date demande" className="py-3.5 px-4 text-center font-mono text-slate-500">
                        {formatDateFr(p.date_demande)}
                      </td>
                      <td data-label="Statut" className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          p.statut_prestation === 'PAYE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.statut_prestation === 'ANNULE'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {p.statut_prestation}
                        </span>
                      </td>
                      <td data-label="Montant" className="py-3.5 px-4 text-right font-extrabold font-mono text-slate-800">
                        {formatFCFA(p.montant)}
                      </td>
                      <td data-label="Actions" className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {!['PAYE', 'ANNULE'].includes(p.statut_prestation) && (
                            <button
                              onClick={() => handleNextStatut(p)}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold"
                            >
                              {p.statut_prestation === 'DOSSIER_OUVERT'
                                ? 'Mettre en contrôle'
                                : p.statut_prestation === 'EN_CONTROLE'
                                  ? 'Valider'
                                  : 'Marquer payé'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadLiquidation(p)}
                            className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold"
                          >
                            Liquidation PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTableWrapper>
          )}
        </div>
      )}

      {/* TAB 2: ANNUITÉS & RENTES */}
      {activeTab === 'RENTES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: list of rentes */}
          <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1 pb-3 border-b border-slate-100">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>Grands Livres des Rentes actives</span>
            </h3>

            {isLoadingRentes ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="animate-spin text-slate-400" />
              </div>
            ) : rentes.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Aucune rente enregistrée.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="rtable min-w-full divide-y divide-slate-100 text-xs text-left" id="tbl-rentes">
                  <thead className="bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
                    <tr>
                      <th className="py-3 px-3">Adhérent</th>
                      <th className="py-3 px-3 text-center">Matricule</th>
                      <th className="py-3 px-3 text-right">Capital initial</th>
                      <th className="py-3 px-3 text-right">Capital restant</th>
                      <th className="py-3 px-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rentes.map(r => (
                      <tr
                        key={r.id}
                        id={`btn-select-rente-${r.id}`}
                        onClick={() => loadRenteVersements(r)}
                        className={`cursor-pointer transition-all hover:bg-slate-50/70 ${
                          selectedRente?.id === r.id ? 'bg-emerald-50/30 border-l-4 border-l-emerald-600 text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        <td data-label="Adhérent" className="py-3.5 px-3 font-bold uppercase">{r.nom} {r.prenoms}</td>
                        <td data-label="Matricule" className="py-3.5 px-3 text-center font-bold text-slate-800 font-mono">{r.matricule}</td>
                        <td data-label="Capital initial" className="py-3.5 px-3 text-right font-mono font-medium">{formatFCFA(r.capital_initial)}</td>
                        <td data-label="Capital restant" className="py-3.5 px-3 text-right font-bold font-mono text-emerald-600">{formatFCFA(r.capital_restant)}</td>
                        <td data-label="Statut" className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                            r.statut_rente === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.statut_rente}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel: versements details for selected rente */}
          <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-mono flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Wallet className="w-4 h-4" />
              <span>Détails des versements mensuels</span>
            </h3>

            {selectedRente ? (
              <div className="space-y-4 text-xs font-sans">
                {/* Brief description */}
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Bénéficiaire de l'annuité</p>
                  <p className="font-extrabold text-slate-105 text-sm uppercase mt-0.5">{selectedRente.nom} {selectedRente.prenoms}</p>
                  <p className="text-slate-500 mt-1">Matricule DGI : {selectedRente.matricule}</p>
                </div>

                <div className="p-3 bg-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Capital Reconstitué :</span>
                    <span className="font-bold text-slate-100">{formatFCFA(selectedRente.capital_initial)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Provision Restante :</span>
                    <span className="font-bold">{formatFCFA(selectedRente.capital_restant)}</span>
                  </div>
                </div>

                {/* Payments sub-table */}
                <div className="space-y-2.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Disboursements mensuels émis</p>
                  
                  {isLoadingVersements ? (
                    <p className="text-slate-500 text-xs italic">Chargement des virements...</p>
                  ) : versements.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4 bg-slate-800/40 rounded">Aucun versement effectué.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {versements.map((v, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 bg-slate-800/50 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-mono text-slate-350">{formatDateFr(v.date_versement)}</span>
                          </div>
                          <span className="font-bold text-emerald-400 font-mono">
                            + {formatFCFA(v.montant_versement)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs text-center py-10">Sélectionnez une rente dans la liste de gauche pour afficher l'historique complet de ses versements.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ECHEANCES_APS' && (
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">Année</label>
              <input type="number" value={anneeEcheances} onChange={(e) => setAnneeEcheances(Number(e.target.value))}
                className="mt-1 w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500">Trimestre</label>
              <select value={trimestreEcheances} onChange={(e) => setTrimestreEcheances(Number(e.target.value))}
                className="mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                {[1, 2, 3, 4].map((t) => <option key={t} value={t}>T{t}</option>)}
              </select>
            </div>
            {currentUser.role !== 'ADHERENT' && (
              <button onClick={handleGenererEcheances} disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-50">
                {isSubmitting ? 'Génération…' : 'Générer les échéances'}
              </button>
            )}
            <div className="ml-auto text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total à payer à l’APS</p>
              <p className="text-xl font-extrabold text-emerald-700">
                {formatFCFA(echeances.filter((e) => e.statut !== 'ANNULEE').reduce((s, e) => s + Number(e.montant_versement || 0), 0))}
              </p>
            </div>
          </div>

          <ScrollableTableWrapper>
            <table className="rtable min-w-full divide-y divide-slate-100 text-sm bg-white">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="p-3 text-left">Retraité</th><th className="p-3">Matricule</th>
                  <th className="p-3">Période</th><th className="p-3 text-right">Montant APS</th>
                  <th className="p-3">Échéance</th><th className="p-3">Statut</th><th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingEcheances ? (
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400">Chargement…</td></tr>
                ) : echeances.length === 0 ? (
                  <tr><td colSpan={7} className="p-10 text-center text-slate-400">Aucune échéance pour cette période.</td></tr>
                ) : echeances.map((e) => (
                  <tr key={e.id}>
                    <td data-label="Retraité" className="p-3 font-bold uppercase">{e.nom} {e.prenoms}</td>
                    <td data-label="Matricule" className="p-3 text-center font-mono">{e.matricule}</td>
                    <td data-label="Période" className="p-3 text-center font-bold">{e.periode}</td>
                    <td data-label="Montant APS" className="p-3 text-right font-bold text-emerald-700">{formatFCFA(e.montant_versement)}</td>
                    <td data-label="Échéance" className="p-3 text-center">{e.date_echeance ? formatDateFr(e.date_echeance) : '—'}</td>
                    <td data-label="Statut" className="p-3 text-center"><span className="px-2 py-1 bg-slate-100 rounded-full text-[10px] font-bold">{e.statut}</span></td>
                    <td data-label="Action" className="p-3 text-center">
                      {currentUser.role !== 'ADHERENT' && ['GENEREE', 'EN_CONTROLE', 'VALIDEE'].includes(e.statut || '') && (
                        <button onClick={() => handleAvancerEcheance(e)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold">
                          {e.statut === 'GENEREE' ? 'Contrôler' : e.statut === 'EN_CONTROLE' ? 'Valider' : 'Payer APS'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableTableWrapper>
        </div>
      )}
    </div>
  );
}
