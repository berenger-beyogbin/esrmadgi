import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, Search, TrendingUp, UserRoundCheck, UsersRound, XCircle } from 'lucide-react';
import { CommercialActivity } from '../types';
import { onlineAdhesionService } from '../services/onlineAdhesionService';

export default function ActiviteCommerciale() {
  const [data, setData] = useState<CommercialActivity | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await onlineAdhesionService.commercialActivity();
    setLoading(false);
    if (result.error || !result.data) {
      setError(result.error?.message || 'Impossible de charger la synthese commerciale.');
      return;
    }
    setData(result.data);
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return data?.commerciaux ?? [];
    return (data?.commerciaux ?? []).filter((row) => `${row.matricule} ${row.email}`.toLocaleLowerCase('fr').includes(term));
  }, [data, search]);

  const summary = data?.synthese;
  return (
    <div className="space-y-6" id="commercial-activity">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-[#2b529f]">Pilotage du reseau</p><h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-1">Activite commerciale</h2><p className="text-sm text-slate-500 mt-2">Synthese des inscriptions et performances de tous les commerciaux.</p></div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser</button>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <Metric label="Commerciaux" value={summary?.commerciaux ?? 0} icon={<UsersRound />} color="text-[#2b529f]" />
        <Metric label="Actifs" value={summary?.commerciaux_actifs ?? 0} icon={<UserRoundCheck />} color="text-cyan-600" />
        <Metric label="Dossiers" value={summary?.dossiers ?? 0} icon={<TrendingUp />} color="text-violet-600" />
        <Metric label="En attente" value={summary?.en_attente ?? 0} icon={<Clock3 />} color="text-amber-600" />
        <Metric label="Valides" value={summary?.valides ?? 0} icon={<CheckCircle2 />} color="text-emerald-600" />
        <Metric label="Rejetes" value={summary?.rejetes ?? 0} icon={<XCircle />} color="text-rose-600" />
        <Metric label="Conversion" value={`${summary?.taux_conversion ?? 0}%`} icon={<TrendingUp />} color="text-indigo-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-800">Performance par commercial</h3><p className="text-xs text-slate-500 mt-1">Classement par nombre de dossiers saisis.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Matricule ou email" className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div></div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3 text-left">Commercial</th><th className="px-4 py-3 text-center">Statut</th><th className="px-4 py-3 text-center">Dossiers</th><th className="px-4 py-3 text-center">Attente</th><th className="px-4 py-3 text-center">Valides</th><th className="px-4 py-3 text-center">Rejetes</th><th className="px-4 py-3 text-center">Conversion</th><th className="px-4 py-3 text-left">Derniere activite</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id_utilisateur} className="hover:bg-slate-50/70"><td className="px-4 py-4"><p className="font-bold text-slate-800">{row.matricule}</p><p className="text-xs text-slate-500">{row.email}</p></td><td className="px-4 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${row.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.actif ? 'Actif' : 'Desactive'}</span></td><td className="px-4 py-4 text-center font-extrabold">{row.total}</td><td className="px-4 py-4 text-center text-amber-700 font-bold">{row.en_attente}</td><td className="px-4 py-4 text-center text-emerald-700 font-bold">{row.valides}</td><td className="px-4 py-4 text-center text-rose-700 font-bold">{row.rejetes}</td><td className="px-4 py-4 text-center font-extrabold text-[#2b529f]">{row.taux_conversion}%</td><td className="px-4 py-4 text-slate-500">{row.derniere_activite ? new Date(row.derniere_activite).toLocaleString('fr-FR') : '-'}</td></tr>)}</tbody></table>{loading && <div className="p-12 text-center text-slate-500">Chargement de la synthese...</div>}{!loading && !rows.length && !error && <div className="p-12 text-center text-slate-400">Aucun commercial trouve.</div>}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactElement; color: string }) {
  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className={`${color} [&>svg]:w-5 [&>svg]:h-5`}>{icon}</div><p className="text-[11px] uppercase font-bold text-slate-400 mt-3">{label}</p><p className="text-2xl font-extrabold text-slate-800">{value}</p></div>;
}
