import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Loader2, RefreshCw, Users, X, ClipboardList, TrendingUp, Coins } from 'lucide-react';
import { ControleCloturePeriode, DBUser, PeriodeMetier } from '../types';
import { periodeService } from '../services/periodeService';
import { formatDateFr } from '../utils/formatters';

interface CloturePeriodeProps { currentUser: DBUser }

const cards = [
  { key: 'adherentsConcernes', label: 'Adhérents concernés', icon: Users, className: 'bg-blue-600' },
  { key: 'precomptesAttendus', label: 'Précomptes attendus', icon: ClipboardList, className: 'bg-amber-500' },
  { key: 'precomptesEncaisses', label: 'Précomptes encaissés', icon: CheckCircle2, className: 'bg-emerald-600' },
  { key: 'precomptesRegularises', label: 'Précomptes régularisés', icon: RefreshCw, className: 'bg-indigo-600' },
  { key: 'paiementsSpontanes', label: 'Paiements spontanés', icon: TrendingUp, className: 'bg-rose-600' },
] as const;

export default function CloturePeriode({ currentUser }: CloturePeriodeProps) {
  const [periodes, setPeriodes] = useState<PeriodeMetier[]>([]);
  const [periode, setPeriode] = useState('');
  const [controle, setControle] = useState<ControleCloturePeriode | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canClose = currentUser.role === 'ADMINISTRATEUR' || currentUser.role === 'SUPERADMIN';

  const loadPeriodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await periodeService.list();
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    const ouvertes = result.data.filter((item) => item.statut === 'OUVERTE');
    setPeriodes(ouvertes);
    setPeriode((current) => ouvertes.some((item) => item.periode === current) ? current : (ouvertes[0]?.periode ?? ''));
    if (ouvertes.length === 0) setLoading(false);
  }, []);

  const loadControle = useCallback(async (selected: string) => {
    if (!selected) { setControle(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const result = await periodeService.getControleCloture(selected);
    setControle(result.data);
    setError(result.error?.message ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void loadPeriodes(); }, [loadPeriodes]);
  useEffect(() => { if (periode) void loadControle(periode); }, [periode, loadControle]);

  const handleCloturer = async () => {
    if (!controle?.clotureAutorisee || !canClose) return;
    if (!window.confirm(`Confirmer la clôture définitive de la période ESR ${controle.periode} ?`)) return;
    setClosing(true);
    setError(null);
    setSuccess(null);
    const result = await periodeService.cloturer(controle.periode);
    setClosing(false);
    if (result.error) { setError(result.error.message); return; }
    setSuccess(`Période ${controle.periode} clôturée avec succès. La période ${result.data?.periode_suivante ?? 'suivante'} est ouverte.`);
    setControle(null);
    await loadPeriodes();
  };

  const checks = controle ? [
    [controle.controles.cotisationsToutesEncaissees, 'Toutes les cotisations prévues ont été encaissées', "Certaines cotisations prévues n'ont pas été encaissées"],
    [controle.controles.paiementsAvecDateValeur, 'Toutes les cotisations encaissées ont une date de valeur', "Certaines cotisations encaissées n'ont pas de date de valeur"],
    [controle.controles.precomptesTousTraites, 'Tous les retours de précompte ont été traités', "Certains retours de précompte n'ont pas encore été traités"],
    [controle.controles.datesValeurCompatibles, "Toutes les dates de valeur sont compatibles avec la date d'arrêté", "Certaines dates de valeur sont postérieures à la date d'arrêté"],
  ] as const : [];

  return (
    <div className="space-y-6" id="cloture-periode-container">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Clôture de Période ESR</h2>
          <p className="text-sm text-slate-500 mt-1">Contrôles financiers et arrêté actuariel trimestriel</p>
        </div>
        <button onClick={() => periode && loadControle(periode)} disabled={loading || !periode} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">{error}</div>}
      {success && <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold">{success}</div>}

      {loading && !controle ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-100 flex justify-center"><Loader2 className="w-8 h-8 text-[#2b529f] animate-spin" /></div>
      ) : periodes.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 text-slate-500">Aucune période ESR ouverte.</div>
      ) : controle && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <h3 className="text-xl font-bold text-[#173b75]">Période ESR ouverte : {controle.periode}</h3>
                {periodes.length > 1 && <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl font-mono">{periodes.map((item) => <option key={item.periode}>{item.periode}</option>)}</select>}
              </div>
              <button onClick={handleCloturer} disabled={!controle.clotureAutorisee || closing || !canClose} className={`w-full py-4 rounded-xl font-bold text-white transition ${controle.clotureAutorisee && canClose ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-800 cursor-not-allowed'}`}>
                {closing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : controle.clotureAutorisee && canClose ? 'Cliquer ici pour clôturer' : 'Clôture impossible'}
              </button>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between"><span className="text-slate-500">Statut :</span><strong>{controle.statut}</strong></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Date prévue de clôture :</span><strong>{formatDateFr(controle.dateCloturePrevue)}</strong></div>
            </div>
          </div>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <h3 className="px-6 py-4 bg-blue-50 text-xl font-bold text-[#173b75]">Synthèse</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 p-6">
              {cards.map(({ key, label, icon: Icon, className }) => <div key={key} className={`${className} text-white p-5 rounded-xl`}><div className="flex items-center gap-4"><Icon className="w-8 h-8" /><strong className="text-3xl">{controle.synthese[key]}</strong></div><p className="mt-3 text-white/90">{label}</p></div>)}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <h3 className="px-6 py-4 bg-emerald-50 text-xl font-bold text-emerald-800">Contrôles avant clôture</h3>
              <div className="p-6 space-y-4">{checks.map(([valid, ok, ko]) => <div key={ok} className="flex gap-3 items-start">{valid ? <span className="p-1 bg-emerald-100 rounded-full"><Check className="w-4 h-4 text-emerald-700" /></span> : <span className="p-1 bg-rose-100 rounded-full"><X className="w-4 h-4 text-rose-700" /></span>}<span className={valid ? 'text-slate-700' : 'text-rose-800 font-medium'}>{valid ? ok : ko}</span></div>)}</div>
            </section>
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <h3 className="px-6 py-4 bg-amber-50 text-xl font-bold text-amber-800">Alertes</h3>
              <div className="p-5 space-y-3">{controle.alertes.length === 0 ? <p className="text-emerald-700 flex gap-2"><CheckCircle2 className="w-5 h-5" /> Aucun blocage détecté.</p> : controle.alertes.map((item) => <p key={item} className="text-sm text-amber-900 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{item}</p>)}{!canClose && <p className="text-sm text-slate-500 flex gap-2"><Coins className="w-4 h-4 shrink-0" />La clôture définitive est réservée aux administrateurs.</p>}</div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
