import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/dashboardService';
import { DashboardStats, DBUser } from '../types';
import { Users, FileText, Calendar, TrendingUp, RefreshCw } from 'lucide-react';
import { formatFCFA, formatDateFr } from '../utils/formatters';
import { exporterCimaC20 } from '../services/reportingService';

interface DashboardProps {
  currentUser: DBUser;
}

export default function Dashboard({ currentUser }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExportingCima, setIsExportingCima] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isDev = (import.meta as any).env?.DEV === true;
      if (isDev) console.error('[DASHBOARD] error', e);
      setErrorMsg(e instanceof Error ? e.message : 'Erreur inconnue lors du chargement des statistiques.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExportCima = async () => {
    setIsExportingCima(true);
    setErrorMsg(null);
    try {
      await exporterCimaC20(new Date().getFullYear());
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Export CIMA impossible.');
    } finally {
      setIsExportingCima(false);
    }
  };

  // SVG chart — max dynamique basé sur les données réelles
  const chartDataMax = stats ? Math.max(stats.capitalAcquisTotal, stats.totalPm) : 0;
  const CHART_MAX =
    chartDataMax > 0 ? Math.ceil(chartDataMax / 1_000_000) * 1_000_000 : 1_000_000;
  const chartIsEmpty = stats !== null && chartDataMax === 0;

  const CHART_BOTTOM = 195;
  const CHART_AREA_H = 175;

  const barHeight = (val: number) =>
    CHART_MAX > 0 ? Math.max(Math.min((val / CHART_MAX) * CHART_AREA_H, CHART_AREA_H), 1) : 1;
  const barY = (val: number) => CHART_BOTTOM - barHeight(val);

  const yLabelLines = [
    { textY: 24,  value: CHART_MAX },
    { textY: 59,  value: Math.round(CHART_MAX * 0.8) },
    { textY: 94,  value: Math.round(CHART_MAX * 0.6) },
    { textY: 129, value: Math.round(CHART_MAX * 0.4) },
    { textY: 164, value: Math.round(CHART_MAX * 0.2) },
    { textY: 199, value: 0 },
  ];

  // Donut — actifs vs total
  const CIRCUMFERENCE = 219.9;
  const total = stats
    ? stats.repartition.actif + stats.repartition.retraite + stats.repartition.decede + stats.repartition.autre
    : 0;
  const pctActifs =
    stats && total > 0 ? Math.round((stats.repartition.actif / total) * 100) : 0;
  const arcActifs = (pctActifs / 100) * CIRCUMFERENCE;

  return (
    <div className="space-y-6" id="dashboard-wrapper">

      {/* Upper bar */}
      <div className="flex justify-between items-center gap-2 bg-white/45 px-2 py-1 rounded-lg">
        <div className="min-w-0">
          <p className="sm:hidden text-xs text-slate-600 font-medium truncate">
            {new Date().toLocaleDateString('fr-FR')} ·{' '}
            <span className="font-bold text-[#2b529f]">
              {currentUser.prenoms || currentUser.nom || currentUser.matricule}
            </span>
          </p>
          <p className="hidden sm:block text-sm text-slate-600 font-medium">
            Rapport en date du {new Date().toLocaleDateString('fr-FR')} — Connecté en tant que :{' '}
            <span className="font-bold text-[#2b529f]">
              {currentUser.prenoms} {currentUser.nom}
            </span>
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-sm text-[#2b529f] hover:underline font-bold transition shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
        {currentUser.role !== 'ADHERENT' && (
          <button
            onClick={handleExportCima}
            disabled={isExportingCima}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {isExportingCima ? 'Export...' : 'CIMA C-20 Excel'}
          </button>
        )}
      </div>

      {/* Header */}
      <div className="border-b border-black pb-2 text-left shrink-0">
        <h1 className="text-3xl sm:text-4xl font-semibold text-black font-sans tracking-tight">
          Tableau de bord
        </h1>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-lg font-medium">
          Erreur de chargement : {errorMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: Blue — Adhérents actifs */}
        <div className="bg-[#5b9bd5] text-white rounded-xs p-5 flex flex-col md:flex-row items-center justify-center text-center gap-3 shadow-xs hover:opacity-95 transition-all">
          <Users className="w-10 h-10 shrink-0 text-white stroke-[1.8]" />
          <div className="space-y-1">
            <span className="block text-2.5xl font-bold font-sans">
              {isLoading ? '…' : stats !== null ? stats.totalAdherentsActifs : '—'}
            </span>
            <span className="block text-sm font-semibold underline decoration-dotted underline-offset-4 cursor-pointer">
              Adhérents actifs
            </span>
          </div>
        </div>

        {/* Card 2: Orange — Cotisation trimestrielle */}
        <div className="bg-[#ed7d31] text-white rounded-xs p-5 flex flex-col md:flex-row items-center justify-center text-center gap-3 shadow-xs hover:opacity-95 transition-all">
          <FileText className="w-10 h-10 shrink-0 text-white stroke-[1.8]" />
          <div className="space-y-1">
            <span className="block text-2.5xl font-bold font-sans">
              {isLoading ? '…' : stats !== null ? formatFCFA(stats.cotisationTrimestrielleTotale) : '—'}
            </span>
            <span className="block text-sm font-semibold underline decoration-dotted underline-offset-4 cursor-pointer">
              Cotisation trimestrielle
            </span>
          </div>
        </div>

        {/* Card 3: Green — Prestation (0 : aucun module prestation branché) */}
        <div className="bg-[#70ad47] text-white rounded-xs p-5 flex flex-col md:flex-row items-center justify-center text-center gap-3 shadow-xs hover:opacity-95 transition-all">
          <Calendar className="w-10 h-10 shrink-0 text-white stroke-[1.8]" />
          <div className="space-y-1">
            <span className="block text-2.5xl font-bold font-sans">
              {isLoading ? '…' : stats !== null ? stats.nombrePrestations : '—'}
            </span>
            <span className="block text-sm font-semibold underline decoration-dotted underline-offset-4 cursor-pointer">
              Prestation
            </span>
          </div>
        </div>

        {/* Card 4: Red-Brown — Provision totale */}
        <div className="bg-[#c0504d] text-white rounded-xs p-5 flex flex-col md:flex-row items-center justify-center text-center gap-3 shadow-xs hover:opacity-95 transition-all">
          <TrendingUp className="w-10 h-10 shrink-0 text-white stroke-[1.8]" />
          <div className="space-y-1">
            <span className="block text-2.5xl font-bold font-sans">
              {isLoading ? '…' : stats !== null ? formatFCFA(stats.provisionTotale) : '—'}
            </span>
            <span className="block text-sm font-semibold underline decoration-dotted underline-offset-4 cursor-pointer">
              Provision totale
            </span>
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">

        {/* Left: Bar Chart — Capital acquis / Provision mathématiques */}
        <div className="bg-white p-5 rounded-lg border border-slate-150 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 text-left">
              Capital acquis / Provision mathématiques
            </h3>

            {/* Toolbar masquée — boutons sans action en attente d'implémentation */}
          </div>

          <div className="pt-6 relative h-64 w-full">
            {!stats || isLoading ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                {isLoading ? 'Chargement…' : 'Donnée non disponible'}
              </div>
            ) : chartIsEmpty ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Aucune donnée de capital ou de provision disponible.
              </div>
            ) : (
              <svg className="w-full h-full" viewBox="0 0 500 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Grid */}
                <line x1="80" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="80" y1="55" x2="480" y2="55" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="80" y1="90" x2="480" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="80" y1="125" x2="480" y2="125" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="80" y1="160" x2="480" y2="160" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="80" y1="195" x2="480" y2="195" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Y Axis Labels — dynamiques */}
                {yLabelLines.map(({ textY, value }) => (
                  <text key={textY} x="70" y={textY} fill="#64748b" fontSize="10" textAnchor="end">
                    {new Intl.NumberFormat('fr-FR').format(value)}
                  </text>
                ))}

                {/* Purple Bar — capitalAcquisTotal */}
                <rect
                  x="200"
                  y={barY(stats.capitalAcquisTotal)}
                  width="70"
                  height={barHeight(stats.capitalAcquisTotal)}
                  fill="#c5a3e1"
                  stroke="#a78bfa"
                  strokeWidth="0.8"
                />
                <text
                  x="235"
                  y={barY(stats.capitalAcquisTotal) - 6}
                  fill="#581c87"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {new Intl.NumberFormat('fr-FR').format(stats.capitalAcquisTotal)}
                </text>

                {/* Blue Bar — totalPm */}
                <rect
                  x="270"
                  y={barY(stats.totalPm)}
                  width="112"
                  height={barHeight(stats.totalPm)}
                  fill="#5b9bd5"
                  stroke="#3b82f6"
                  strokeWidth="0.8"
                />
                <text
                  x="326"
                  y={barY(stats.totalPm) - 6}
                  fill="#1e3a8a"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {new Intl.NumberFormat('fr-FR').format(stats.totalPm)}
                </text>
              </svg>
            )}
          </div>
        </div>

        {/* Right: Donut — Répartition des adhérents */}
        <div className="bg-white p-5 rounded-lg border border-slate-150 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 text-left pb-3 border-b border-slate-100">
              Répartition des adhérents
            </h3>
          </div>

          <div className="flex-1 flex justify-center items-center py-6">
            {!stats ? (
              <p className="text-slate-400 text-sm">
                {isLoading ? 'Chargement…' : 'Donnée non disponible'}
              </p>
            ) : (
              <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="35"
                    fill="transparent"
                    stroke="#5b9bd5"
                    strokeWidth="20"
                    strokeDasharray={`${arcActifs} ${CIRCUMFERENCE}`}
                    strokeDashoffset="0"
                  />
                </svg>
                <div className="absolute inset-8 rounded-full bg-white shadow-inner flex flex-col items-center justify-center p-3 select-none">
                  <span className="text-xs sm:text-sm font-bold text-slate-500 font-mono tracking-wider">
                    ACTIF
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#2b529f]">
                    {stats.totalAdherentsActifs}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-500 font-mono">
                    {pctActifs}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Lower Blue Block */}
      <div className="bg-[#2b529f] text-white p-5 rounded font-sans shadow-xs mt-6" id="dashboard-tables-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Panel: Dernières cotisations */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-tight text-left">
              Dernières cotisations
            </h3>
            <div className="bg-white rounded shadow-sm text-slate-800 text-left overflow-hidden">
              <div className="md:hidden">
                {isLoading ? (
                  <div className="py-10 px-4 text-center text-slate-400 font-medium">
                    Chargement…
                  </div>
                ) : stats && stats.dernieresCotisations.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {stats.dernieresCotisations.slice(0, 2).map((c, i) => (
                      <article key={i} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase text-slate-500">Date</p>
                            <p className="mt-1 text-sm font-mono text-slate-700">{formatDateFr(c.date)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] font-black uppercase text-slate-500">Montant</p>
                            <p className="mt-1 text-base font-black text-slate-900">{formatFCFA(c.montant)}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 rounded bg-slate-50 p-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase text-slate-500">Adhérent</p>
                            <p className="mt-1 truncate text-sm font-bold text-slate-800">{c.adherent || '—'}</p>
                            {c.matricule && (
                              <p className="mt-0.5 text-xs font-mono text-slate-500">{c.matricule}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase text-slate-500">Source</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{c.source || '—'}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center text-slate-400 font-medium">
                    Aucune cotisation récente disponible.
                  </div>
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="bg-[#dce4f0] text-sm font-bold text-slate-700 border-b border-slate-300">
                      <th className="py-3.5 px-4 text-left">Date</th>
                      <th className="py-3.5 px-4 text-center">Montant</th>
                      <th className="py-3.5 px-4 text-center">Adhérent</th>
                      <th className="py-3.5 px-4 text-center">Source</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                          Chargement…
                        </td>
                      </tr>
                    ) : stats && stats.dernieresCotisations.length > 0 ? (
                      stats.dernieresCotisations.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-left text-slate-600 font-mono">
                            {formatDateFr(c.date)}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-800">
                            {formatFCFA(c.montant)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-semibold text-slate-800">{c.adherent}</span>
                            {c.matricule && (
                              <span className="block text-xs text-slate-500">{c.matricule}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {c.source || '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                          Aucune cotisation récente disponible.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Panel: Dernières prestations */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold tracking-tight text-left">
              Dernières prestations
            </h3>
            <div className="bg-white rounded shadow-sm text-slate-800 text-left overflow-hidden min-h-[110px]">
              <div className="md:hidden">
                {isLoading ? (
                  <div className="py-10 px-4 text-center text-slate-400 font-medium">
                    Chargement…
                  </div>
                ) : stats && stats.dernieresPrestations.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {stats.dernieresPrestations.slice(0, 2).map((p, i) => (
                      <article key={i} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase text-slate-500">Date</p>
                            <p className="mt-1 text-sm font-mono text-slate-700">{formatDateFr(p.date)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[11px] font-black uppercase text-slate-500">Statut</p>
                            <span className="mt-1 inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                              {p.statut || '—'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 rounded bg-slate-50 p-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase text-slate-500">Adhérent</p>
                            <p className="mt-1 truncate text-sm font-bold text-slate-800">{p.adherent || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase text-slate-500">Type</p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">{p.type || '—'}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 px-4 text-center text-slate-400 font-medium">
                    Aucune prestation récente disponible.
                  </div>
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="bg-[#dce4f0] text-sm font-bold text-slate-700 border-b border-slate-300">
                      <th className="py-3.5 px-4 text-left">Date</th>
                      <th className="py-3.5 px-4 text-center">Adhérent</th>
                      <th className="py-3.5 px-4 text-center">Type</th>
                      <th className="py-3.5 px-4 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                          Chargement…
                        </td>
                      </tr>
                    ) : stats && stats.dernieresPrestations.length > 0 ? (
                      stats.dernieresPrestations.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-left text-slate-600 font-mono">
                            {formatDateFr(p.date)}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-800">
                            {p.adherent || '—'}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">
                            {p.type || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                              {p.statut || '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                          Aucune prestation récente disponible.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
