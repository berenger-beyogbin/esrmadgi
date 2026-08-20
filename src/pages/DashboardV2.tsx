import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, CheckCircle2, CircleDollarSign, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { getDashboardStats } from '../services/dashboardService';
import { periodeService } from '../services/periodeService';
import { CimaC20Report, getCimaC20 } from '../services/reportingService';
import { DashboardStats, DBUser } from '../types';
import { formatDateFr, formatFCFA } from '../utils/formatters';

interface DashboardV2Props { currentUser: DBUser }
type FilterMode = 'TRIMESTRE' | 'ANNEE';

function quarterNow(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function readableSource(source?: string): string {
  const labels: Record<string, string> = {
    PRECOMPTE: 'Précompte', SPONTANEE: 'Cotisation spontanée',
    REGULARISATION_PRECOMPTE: 'Régularisation de précompte', DIRECT: 'Versement direct',
  };
  return labels[String(source ?? '').toUpperCase()] ?? String(source || '-').replace(/_/g, ' ');
}

export default function DashboardV2({ currentUser }: DashboardV2Props) {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<FilterMode>('TRIMESTRE');
  const [annee, setAnnee] = useState(currentYear);
  const [trimestre, setTrimestre] = useState(quarterNow());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cima, setCima] = useState<CimaC20Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [periodeInitialisee, setPeriodeInitialisee] = useState(false);

  useEffect(() => {
    let active = true;

    const initialiserPeriode = async () => {
      try {
        const { data } = await periodeService.list();
        if (!active) return;

        const periodeOuverte = data
          .filter((periode) => periode.statut === 'OUVERTE')
          .sort((a, b) => b.periode.localeCompare(a.periode))[0];

        if (periodeOuverte) {
          setAnnee(periodeOuverte.annee);
          setTrimestre(periodeOuverte.trimestre);
          setMode('TRIMESTRE');
        }
      } finally {
        if (active) setPeriodeInitialisee(true);
      }
    };

    initialiserPeriode();
    return () => { active = false; };
  }, []);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const periodeProvision = `${annee}T${mode === 'ANNEE' ? 4 : trimestre}`;
      const [dashboard, report] = await Promise.all([getDashboardStats(periodeProvision), getCimaC20(annee)]);
      setStats(dashboard);
      setCima(report);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger le tableau de bord.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (periodeInitialisee) load();
  }, [annee, mode, trimestre, periodeInitialisee]);

  const anneesDisponibles = useMemo(
    () => Array.from(new Set([...Array.from({ length: 6 }, (_, index) => currentYear - 4 + index), annee])).sort((a, b) => a - b),
    [annee, currentYear],
  );

  const selectedRows = useMemo(() => {
    if (!cima) return [];
    return mode === 'ANNEE' ? cima.trimestres : cima.trimestres.filter((row) => row.periode === `${annee}T${trimestre}`);
  }, [annee, cima, mode, trimestre]);

  const attendu = selectedRows.reduce((sum, row) => sum + row.cotisationsPrevues, 0);
  const encaisse = selectedRows.reduce((sum, row) => sum + row.cotisationsEncaissees, 0);
  const ecart = Math.max(0, attendu - encaisse);
  const taux = attendu > 0 ? Math.min(100, Math.round((encaisse / attendu) * 100)) : 0;
  const totalAdherents = stats ? (Object.values(stats.repartition) as number[]).reduce((sum, value) => sum + value, 0) : 0;
  const periodeLabel = mode === 'ANNEE' ? `Année ${annee}` : `${annee}T${trimestre}`;
  const provisionValue = stats?.provisionDisponible
    ? formatFCFA(stats.provisionTotale)
    : 'Non calculée';
  const provisionDetail = stats?.provisionDisponible && stats.provisionDateArrete
    ? `Provision arrêtée au ${formatDateFr(stats.provisionDateArrete)}`
    : `Provision non calculée pour ${mode === 'ANNEE' ? `${annee}T4` : `${annee}T${trimestre}`}`;
  const recentCotisations = (stats?.dernieresCotisations ?? []).filter((row) => {
    const date = String(row.date ?? '');
    if (!date.startsWith(String(annee))) return false;
    if (mode === 'ANNEE') return true;
    const month = Number(date.slice(5, 7));
    return month > 0 && Math.floor((month - 1) / 3) + 1 === trimestre;
  }).slice(0, 5);

  return (
    <div className="space-y-5 rounded-3xl bg-gradient-to-br from-slate-50 via-blue-50/40 to-amber-50/30 p-1 sm:p-3" id="dashboard-v2">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#17366f] via-[#2b529f] to-[#416bb9] border border-blue-300/30 shadow-xl shadow-blue-950/15 p-5 sm:p-6 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-24 h-44 w-44 rounded-full bg-amber-300/15 blur-2xl" />
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-black text-white">Tableau de bord</h1>
          </div>
          <div className="relative flex flex-wrap items-end gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm">
            <div className="flex rounded-xl bg-blue-950/30 p-1">
              {(['TRIMESTRE', 'ANNEE'] as FilterMode[]).map((item) => (
                <button key={item} onClick={() => setMode(item)} className={`px-3 py-2 rounded-lg text-xs font-black transition ${mode === item ? 'bg-white text-[#2b529f] shadow-md' : 'text-blue-100 hover:text-white'}`}>
                  {item === 'TRIMESTRE' ? 'Par trimestre' : 'Par année'}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold text-blue-100">Année
              <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} className="block mt-1 h-10 rounded-xl border border-white/30 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
                {anneesDisponibles.map((year) => <option key={year}>{year}</option>)}
              </select>
            </label>
            {mode === 'TRIMESTRE' && <label className="text-xs font-bold text-blue-100">Trimestre
              <select value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))} className="block mt-1 h-10 rounded-xl border border-white/30 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm">
                {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>T{quarter}</option>)}
              </select>
            </label>}
            <button onClick={load} disabled={isLoading} className="h-10 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 text-sm font-black text-[#17366f] shadow-lg shadow-amber-950/15 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 transition">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap justify-between gap-2 border-t border-white/15 pt-3 text-xs text-blue-100">
          <span>Période analysée : <strong className="text-white">{periodeLabel}</strong></span>
          <span>{updatedAt ? `Actualisé le ${updatedAt.toLocaleDateString('fr-FR')} à ${updatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Actualisation en attente'} · {currentUser.matricule}</span>
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Kpi icon={<Users />} label="Adhérents actifs" value={stats ? String(stats.totalAdherentsActifs) : '-'} detail={`${totalAdherents} adhérents au total`} tone="blue" />
        <Kpi icon={<CalendarRange />} label="Cotisations attendues" value={formatFCFA(attendu)} detail={periodeLabel} tone="slate" />
        <Kpi icon={<CircleDollarSign />} label="Cotisations encaissées" value={formatFCFA(encaisse)} detail={`${selectedRows.reduce((sum, row) => sum + row.nombreMouvements, 0)} mouvement(s)`} tone="green" />
        <Kpi icon={<TrendingUp />} label="Taux de recouvrement" value={`${taux}%`} detail={`Écart : ${formatFCFA(ecart)}`} tone={taux >= 90 ? 'green' : 'amber'} />
        <Kpi icon={<CheckCircle2 />} label="Provision mathématique" value={provisionValue} detail={provisionDetail} tone="violet" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-3xl bg-gradient-to-br from-white to-blue-50/60 border border-blue-100 shadow-lg shadow-slate-200/50 p-5">
          <h2 className="font-black text-slate-800">Cotisations attendues et encaissées</h2>
          <p className="text-xs text-slate-500 mt-1">Comparaison trimestrielle de l'exercice {annee}</p>
          <div className="mt-6 space-y-5">
            {(cima?.trimestres ?? []).map((row) => {
              const max = Math.max(row.cotisationsPrevues, row.cotisationsEncaissees, 1);
              return <div key={row.periode} className={`${mode === 'TRIMESTRE' && row.periode !== `${annee}T${trimestre}` ? 'opacity-35' : ''}`}>
                <div className="flex justify-between text-xs font-bold text-slate-600"><span>{row.periode}</span><span>{formatFCFA(row.cotisationsEncaissees)} / {formatFCFA(row.cotisationsPrevues)}</span></div>
                <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, row.cotisationsEncaissees / max * 100)}%` }} /></div>
              </div>;
            })}
            {!cima?.trimestres.length && <p className="py-12 text-center text-sm text-slate-400">Aucune donnée pour cet exercice.</p>}
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-white to-amber-50/50 border border-amber-100 shadow-lg shadow-slate-200/50 p-5">
          <h2 className="font-black text-slate-800">Actions requises</h2>
          <div className="mt-4 space-y-3">
            <AlertItem alert={ecart > 0} title="Écart de cotisations" detail={ecart > 0 ? `${formatFCFA(ecart)} restent à rapprocher` : 'Aucun écart sur la période'} />
            <AlertItem alert={(stats?.repartition.autre ?? 0) > 0} title="Adhésions à valider" detail={`${stats?.repartition.autre ?? 0} adhésion(s) en ligne en attente de validation`} />
            <AlertItem alert={(stats?.nombrePrestations ?? 0) > 0} title="Prestations" detail={`${stats?.nombrePrestations ?? 0} prestation(s) enregistrée(s)`} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 items-stretch gap-5">
        <div className="h-full rounded-3xl bg-gradient-to-br from-white to-violet-50/50 border border-violet-100 shadow-lg shadow-slate-200/50 p-4">
          <h2 className="font-black text-slate-800">Répartition des adhérents</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {[['Actifs', stats?.repartition.actif, 'bg-blue-500'], ['Retraités', stats?.repartition.retraite, 'bg-violet-500'], ['Décédés', stats?.repartition.decede, 'bg-slate-500'], ['Adhésions en ligne en attente de validation', stats?.repartition.autre, 'bg-amber-500']].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-xl border border-white/80 bg-white/70 p-3"><span className={`block w-7 h-1 rounded ${color}`} /><p className="mt-2 text-[11px] leading-snug font-bold text-slate-500">{label}</p><p className="mt-0.5 text-xl font-black text-slate-800">{String(value ?? 0)}</p></div>
            ))}
          </div>
        </div>
        <div className="h-full rounded-3xl bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-100 shadow-lg shadow-slate-200/50 p-4">
          <h2 className="font-black text-slate-800">Dernières cotisations de la période</h2>
          <div className="mt-2 divide-y divide-slate-100">
            {recentCotisations.map((row, index) => <div key={index} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><p className="font-bold text-xs text-slate-800 truncate">{row.adherent}</p><p className="mt-0.5 text-[11px] leading-tight text-slate-500">{formatDateFr(row.date)} · {readableSource(row.source)}</p></div><p className="font-black text-xs text-[#2b529f] whitespace-nowrap">{formatFCFA(row.montant)}</p></div>)}
            {recentCotisations.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Aucune cotisation récente sur la période.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: 'blue' | 'green' | 'amber' | 'violet' | 'slate' }) {
  const tones = {
    blue: { card: 'from-blue-50 to-white border-blue-200', icon: 'bg-blue-600 text-white shadow-blue-200', line: 'bg-blue-500' },
    green: { card: 'from-emerald-50 to-white border-emerald-200', icon: 'bg-emerald-600 text-white shadow-emerald-200', line: 'bg-emerald-500' },
    amber: { card: 'from-amber-50 to-white border-amber-200', icon: 'bg-amber-500 text-white shadow-amber-200', line: 'bg-amber-500' },
    violet: { card: 'from-violet-50 to-white border-violet-200', icon: 'bg-violet-600 text-white shadow-violet-200', line: 'bg-violet-500' },
    slate: { card: 'from-slate-100 to-white border-slate-200', icon: 'bg-slate-700 text-white shadow-slate-200', line: 'bg-slate-500' },
  };
  const style = tones[tone];
  return <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br border shadow-lg shadow-slate-200/50 p-4 transition hover:-translate-y-0.5 hover:shadow-xl ${style.card}`}><span className={`absolute inset-x-0 top-0 h-1 ${style.line}`} /><span className={`inline-flex p-2.5 rounded-xl shadow-lg [&>svg]:w-5 [&>svg]:h-5 ${style.icon}`}>{icon}</span><p className="mt-3 text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-slate-900 break-words">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></div>;
}

function AlertItem({ alert, title, detail }: { alert: boolean; title: string; detail: string }) {
  return <div className={`rounded-xl border p-3 ${alert ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex gap-3"><span>{alert ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}</span><div><p className="text-sm font-black text-slate-800">{title}</p><p className="mt-0.5 text-xs text-slate-600">{detail}</p></div></div></div>;
}
