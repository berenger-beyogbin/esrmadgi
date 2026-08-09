import React, { useEffect, useState } from 'react';
import { cotisationService } from '../services/cotisationService';
import { VPrecompteDetails, DBUser, PeriodeMetier } from '../types';
import { Loader2, X, CheckCircle2 } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';

interface RegularisationPrecomptesProps {
  currentUser: DBUser;
}

const MODES_VERSEMENT = ['VIREMENT', 'CHEQUE', 'ESPECES'];

const STATUT_STYLES: Record<string, string> = {
  NON_PRECOMPTE: 'bg-rose-50 text-rose-700 border-rose-200',
  ECART: 'bg-amber-50 text-amber-700 border-amber-200',
};

const todayISO = () => new Date().toISOString().split('T')[0];

export default function RegularisationPrecomptes({ currentUser }: RegularisationPrecomptesProps) {
  const canRegulariser =
    currentUser.role === 'GESTIONNAIRE' ||
    currentUser.role === 'ADMINISTRATEUR' ||
    currentUser.role === 'SUPERADMIN';

  const [periodes, setPeriodes] = useState<PeriodeMetier[]>([]);
  const [periode, setPeriode] = useState('');
  const [isLoadingPeriodes, setIsLoadingPeriodes] = useState(false);

  const [lignes, setLignes] = useState<VPrecompteDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [reportingId, setReportingId] = useState<number | null>(null);

  const [selected, setSelected] = useState<VPrecompteDetails | null>(null);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState(MODES_VERSEMENT[0]);
  const [date, setDate] = useState(todayISO());
  const [numeroCheque, setNumeroCheque] = useState('');
  const [banqueEmettrice, setBanqueEmettrice] = useState('');
  const [titulaireCheque, setTitulaireCheque] = useState('');
  const [dateEmissionCheque, setDateEmissionCheque] = useState(todayISO());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPeriodes() {
      setIsLoadingPeriodes(true);
      const { data, error } = await cotisationService.getPeriodesOuvertes();
      setIsLoadingPeriodes(false);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      const periodesOuvertes = data.filter((item) => item.statut === 'OUVERTE');
      setPeriodes(periodesOuvertes);
      setPeriode((prev) => (
        periodesOuvertes.some((item) => item.periode === prev)
          ? prev
          : periodesOuvertes[0]?.periode ?? ''
      ));
    }
    loadPeriodes();
  }, []);

  const fetchLignes = async (targetPeriode: string) => {
    if (!targetPeriode) {
      setLignes([]);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    const { data, error } = await cotisationService.getNonPrecomptes(targetPeriode);
    setIsLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setLignes(data);
  };

  useEffect(() => {
    fetchLignes(periode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode]);

  const openPayerModal = (ligne: VPrecompteDetails) => {
    setSelected(ligne);
    setMontant(String(ligne.montant_depart ?? ''));
    setMode(MODES_VERSEMENT[0]);
    setDate(todayISO());
    setNumeroCheque('');
    setBanqueEmettrice('');
    setTitulaireCheque('');
    setDateEmissionCheque(todayISO());
    setModalError(null);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setSelected(null);
  };

  const handleValider = async () => {
    if (!selected) return;
    setModalError(null);
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) {
      setModalError('Le montant versé doit être supérieur à 0.');
      return;
    }
    if (!date) {
      setModalError('La date est obligatoire.');
      return;
    }
    if (mode === 'CHEQUE' && (!numeroCheque.trim() || !banqueEmettrice.trim() || !titulaireCheque.trim() || !dateEmissionCheque)) {
      setModalError("Renseignez le numero, la banque, le titulaire et la date d'emission du cheque.");
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await cotisationService.createCotisationSpontanee({
      id_adherent: String(selected.id_adherent),
      matricule: selected.matricule,
      mode,
      date,
      montant: montantNum,
      id_precompte: selected.id_precompte,
      numero_cheque: mode === 'CHEQUE' ? numeroCheque.trim() : undefined,
      banque_emettrice: mode === 'CHEQUE' ? banqueEmettrice.trim() : undefined,
      titulaire_cheque: mode === 'CHEQUE' ? titulaireCheque.trim() : undefined,
      date_emission_cheque: mode === 'CHEQUE' ? dateEmissionCheque : undefined,
    });
    setIsSubmitting(false);

    if (error) {
      setModalError(error.message);
      return;
    }
    if (data?.en_attente_validation) {
      setErrorMsg(`Cheque #${data.paiement?.id ?? ''} en attente de validation bancaire. Le precompte ne sera regularise qu'apres encaissement.`);
    }
    setSelected(null);
    await fetchLignes(periode);
  };

  const handleReporter = async (ligne: VPrecompteDetails) => {
    if (!window.confirm(`Reporter la régularisation de ${ligne.matricule} — ${ligne.nom} ${ligne.prenoms} ?`)) {
      return;
    }
    setReportingId(ligne.id_precompte);
    const { error } = await cotisationService.reporterPrecompte(ligne.id_precompte);
    setReportingId(null);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    await fetchLignes(periode);
  };

  if (!canRegulariser) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-100 shadow-sm text-center text-slate-500">
        Vous n'avez pas les droits pour accéder à cette page.
      </div>
    );
  }

  return (
    <div className="space-y-6" id="regularisation-precomptes-container">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight underline decoration-2 underline-offset-4">
          Régularisation des Précomptes
        </h2>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {errorMsg}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <label className="flex items-center gap-3 max-w-sm">
          <span className="text-sm font-semibold text-slate-600 shrink-0">Trimestre</span>
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            disabled={isLoadingPeriodes || periodes.length === 0}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:ring-2 focus:ring-[#2b529f] focus:outline-none font-mono disabled:opacity-50"
          >
            {periodes.length === 0 && <option value="">Aucune période ouverte</option>}
            {periodes.map((p) => (
              <option key={p.periode} value={p.periode}>{p.periode}</option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <Loader2 className="w-8 h-8 text-[#2b529f] animate-spin" />
          <span className="text-slate-500 text-sm font-medium">Chargement...</span>
        </div>
      ) : lignes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-sm">
            {periode ? `Aucun précompte à régulariser pour ${periode}.` : 'Sélectionnez un trimestre.'}
          </p>
        </div>
      ) : (
        <ScrollableTableWrapper>
          <table className="min-w-full divide-y divide-slate-100 text-sm text-left text-slate-700" id="tbl-regularisation">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600 uppercase tracking-wide font-bold text-xs">
              <tr>
                <th className="py-3.5 px-4">Matricule</th>
                <th className="py-3.5 px-4">Adhérent</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4 text-right">Montant Départ</th>
                <th className="py-3.5 px-4 text-center">Date Départ</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {lignes.map((l) => (
                <tr key={l.id_precompte} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4 font-bold font-mono text-slate-700">{l.matricule}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 uppercase">{l.nom} {l.prenoms}</td>
                  <td className="py-3 px-4 font-bold font-mono text-slate-700">{l.telephone || '-'}</td>
                  <td className="py-3 px-4 text-right font-semibold font-mono text-slate-700">
                    {formatFCFA(l.montant_depart)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {formatDateFr(l.date_generation)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs border ${STATUT_STYLES[l.statut_precompte] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {l.statut_precompte === 'NON_PRECOMPTE' ? 'NON PRECOMPTE' : l.statut_precompte}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        id={`btn-payer-${l.id_precompte}`}
                        onClick={() => openPayerModal(l)}
                        className="px-3 py-1.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-lg text-xs font-bold transition"
                      >
                        Payer maintenant
                      </button>
                      <button
                        id={`btn-reporter-${l.id_precompte}`}
                        onClick={() => handleReporter(l)}
                        disabled={reportingId === l.id_precompte}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition disabled:opacity-50"
                      >
                        {reportingId === l.id_precompte ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reporter'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableWrapper>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2b529f] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">
                Régularisation de non précompte | Cotisation spontanée
              </h3>
              <button onClick={closeModal} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Adhérent</label>
                <input
                  readOnly
                  value={`${selected.matricule} - ${selected.nom} ${selected.prenoms}`}
                  className="block w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">Cotisation trimestrielle</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 font-bold text-center">
                  {formatFCFA(selected.montant_depart)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
                  Montant versé <span className="text-rose-500">*</span>
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

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
                  Mode Versement <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
                >
                  {MODES_VERSEMENT.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 uppercase mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2b529f] text-slate-700"
                />
              </div>

              {mode === 'CHEQUE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="sm:col-span-2 text-xs text-amber-800">
                    Le precompte restera non regularise jusqu'a la compensation du cheque.
                  </p>
                  <input placeholder="Numero du cheque *" value={numeroCheque} onChange={(e) => setNumeroCheque(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                  <input placeholder="Banque emettrice *" value={banqueEmettrice} onChange={(e) => setBanqueEmettrice(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                  <input placeholder="Titulaire du cheque *" value={titulaireCheque} onChange={(e) => setTitulaireCheque(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                  <input type="date" value={dateEmissionCheque} onChange={(e) => setDateEmissionCheque(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
                </div>
              )}

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleValider}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2b529f] hover:bg-[#1c3e7b] text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {mode === 'CHEQUE' ? 'Enregistrer pour validation' : 'Valider'}
                </button>
                <button
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-bold transition disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
