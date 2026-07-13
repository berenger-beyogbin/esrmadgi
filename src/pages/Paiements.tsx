import React, { useEffect, useState } from 'react';
import { paiementService } from '../services/paiementService';
import { adherentService } from '../services/adherentService';
import { Paiement, VAdherentComplet, DBUser } from '../types';
import { Landmark, Plus, BookOpen, CreditCard, ChevronRight, CheckCircle2, RotateCw, Calendar, FileText, HelpCircle } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';

interface PaiementsProps {
  currentUser: DBUser;
}

export default function Paiements({ currentUser }: PaiementsProps) {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [adherents, setAdherents] = useState<VAdherentComplet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    adherent_id: '',
    date_paiement: new Date().toISOString().split('T')[0],
    montant_paiement: '',
    moyen: 'VIREMENT',
    origine_paiement: '',
    observation_dgi: '',
    date_valeur: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data: payList, error: pErr } = await paiementService.getPaiements();
      if (pErr) throw pErr;
      setPaiements(payList || []);

      const { data: adList } = await adherentService.getAdherents();
      setAdherents(adList || []);
      
      if (adList && adList.length > 0) {
        setFormData(prev => ({ ...prev, adherent_id: adList[0].id }));
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur de chargement des paiements.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.adherent_id || !formData.montant_paiement) {
      setErrorMsg('Veuillez remplir tous les champs requis.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const { error } = await paiementService.createPaiement({
        adherent_id: formData.adherent_id,
        date_paiement: formData.date_paiement,
        montant_paiement: parseFloat(formData.montant_paiement),
        moyen: formData.moyen,
        origine_paiement: formData.origine_paiement || 'Paiement direct de l\'adhérent',
        observation_dgi: formData.observation_dgi || '',
        date_valeur: formData.date_valeur,
      });

      if (error) throw error;

      // Reset form & reload
      setFormData(prev => ({
        ...prev,
        montant_paiement: '',
        origine_paiement: '',
        observation_dgi: '',
      }));
      setShowForm(false);
      await loadData();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Impossible d\'enregistrer le paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="paiements-container-wrapper">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Paiements ESR Directs</h2>
          <p className="text-slate-500 text-xs mt-1">
            Enregistrement comptable des règlements directs par banque ou espèces pour les adhérents MADGI.
          </p>
        </div>
        {!showForm && currentUser.role !== 'ADHERENT' && (
          <button
            id="btn-show-paiet-form"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold tracking-wide transition"
          >
            <Plus className="w-4 h-4" />
            Enregistrer un paiement
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl" id="paiement-error-msg">
          {errorMsg}
        </div>
      )}

      {/* FORM MODE */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 max-w-2xl mx-auto" id="paiement-form-container">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <h3 className="font-extrabold text-slate-800 text-base">Nouveau Paiement Direct Adhérent</h3>
            <p className="text-slate-500 text-xs mt-0.5">Saisir les caractéristiques du virement ou chèque émis par l'adhérent.</p>
          </div>

          <form onSubmit={handleCreatePayment} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Adherent List selection */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Adhérent de la MADGI</label>
              <select
                name="adherent_id"
                required
                value={formData.adherent_id}
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 font-semibold"
              >
                <option value="">-- Sélectionner l'adhérent concerné --</option>
                {adherents.map(ad => (
                  <option key={ad.id} value={ad.id}>
                    {ad.matricule} — {ad.nom} {ad.prenoms}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Paiement */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Date du dépôt</label>
              <input
                type="date"
                name="date_paiement"
                required
                value={formData.date_paiement}
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 font-mono"
              />
            </div>

            {/* Date Valeur */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Date de valeur bancaire</label>
              <input
                type="date"
                name="date_valeur"
                required
                value={formData.date_valeur}
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 font-mono"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Montant Règlé (FCFA)</label>
              <input
                type="number"
                name="montant_paiement"
                required
                value={formData.montant_paiement}
                onChange={handleInputChange}
                placeholder="Ex: 120000"
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 font-bold font-mono"
              />
            </div>

            {/* Moyen */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Moyen de Paiement</label>
              <select
                name="moyen"
                value={formData.moyen}
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 font-semibold"
              >
                <option value="VIREMENT">VIREMENT BANCAIRE</option>
                <option value="CHEQUE">CHÈQUE ÉMIS</option>
                <option value="ESPECES">VERSEMENT ESPÈCES</option>
              </select>
            </div>

            {/* Origine */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase">Établissement & Compte d'Origine</label>
              <input
                type="text"
                name="origine_paiement"
                required
                value={formData.origine_paiement}
                onChange={handleInputChange}
                placeholder="Ex: SGCI Côte d'Ivoire - RIB 104... ou Virement BCEAO"
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
            </div>

            {/* Observation / Notes */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase flex items-center justify-between">
                <span>Réf. Observation Bureau MADGI</span>
                <span className="text-[9px] text-slate-400 capitalize font-normal">Optionnel</span>
              </label>
              <textarea
                name="observation_dgi"
                rows={2}
                value={formData.observation_dgi}
                onChange={handleInputChange}
                placeholder="Notes comptables additionnelles..."
                className="mt-1 block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="sm:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                id="btn-payet-cancel"
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                id="btn-payet-submit"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
              >
                {isSubmitting ? 'Publication...' : 'Poster le versement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAYMENTS LIST (ONLY SHOWN IF FORM IS NOT VISIBLE) */}
      {!showForm && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-500 text-xs">Analyse du grand livre des dépôts...</span>
            </div>
          ) : paiements.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-400 text-xs">Aucun paiement direct par banque n'a encore été enregistré.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm text-left text-slate-700" id="tbl-paiements">
                <thead className="bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
                  <tr>
                    <th className="py-3.5 px-4">Adhérent</th>
                    <th className="py-3.5 px-4 text-center">Matricule</th>
                    <th className="py-3.5 px-4 text-center">Date règlement</th>
                    <th className="py-3.5 px-4 text-center">Date valeur</th>
                    <th className="py-3.5 px-4">Moyen</th>
                    <th className="py-3.5 px-4">Établissement / Référence</th>
                    <th className="py-3.5 px-4">Observation</th>
                    <th className="py-3.5 px-4 text-right">Montant payé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paiements.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 font-bold text-slate-800 uppercase">
                        {p.nom_adherent} {p.prenoms_adherent}
                      </td>
                      <td className="py-4 px-4 text-center font-bold font-mono text-slate-700">
                        {p.matricule}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-slate-500">
                        {formatDateFr(p.date_paiement)}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-[11px] text-teal-650">
                        {formatDateFr(p.date_valeur)}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-650 font-semibold text-[9px] border">
                          {p.moyen}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-600 font-sans truncate max-w-xs" title={p.origine_paiement}>
                        {p.origine_paiement}
                      </td>
                      <td className="py-4 px-4 text-slate-500 truncate max-w-xxs" title={p.observation_dgi}>
                        {p.observation_dgi || '-'}
                      </td>
                      <td className="py-4 px-4 text-right font-extrabold font-mono text-emerald-700 text-xs">
                        {formatFCFA(p.montant_paiement)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
