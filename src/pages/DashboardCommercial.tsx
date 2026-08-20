import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FilePlus2, RefreshCw, Search, TrendingUp, XCircle } from 'lucide-react';
import { DBUser, OnlineAdhesion, OnlineAdhesionStatus } from '../types';
import { onlineAdhesionService } from '../services/onlineAdhesionService';

interface DashboardCommercialProps {
  currentUser: DBUser;
  onNewAdhesion: () => void;
}

const statusStyle: Record<OnlineAdhesionStatus, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusLabel: Record<OnlineAdhesionStatus, string> = {
  EN_ATTENTE: 'En attente',
  VALIDE: 'Validee',
  REJETE: 'Rejetee',
};

export default function DashboardCommercial({ currentUser, onNewAdhesion }: DashboardCommercialProps) {
  const [items, setItems] = useState<OnlineAdhesion[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OnlineAdhesionStatus | 'TOUS'>('TOUS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const result = await onlineAdhesionService.listMine({ statut: 'TOUS' });
    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setItems(result.data);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((item) => item.statut_demande === 'EN_ATTENTE').length,
    validated: items.filter((item) => item.statut_demande === 'VALIDE').length,
    rejected: items.filter((item) => item.statut_demande === 'REJETE').length,
  }), [items]);

  const conversion = stats.total ? Math.round((stats.validated / stats.total) * 100) : 0;
  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    return items.filter((item) => {
      if (status !== 'TOUS' && item.statut_demande !== status) return false;
      if (!term) return true;
      return `${item.matricule} ${item.nom} ${item.prenoms}`.toLocaleLowerCase('fr').includes(term);
    });
  }, [items, search, status]);

  return (
    <div className="space-y-6" id="commercial-dashboard">
      <div className="bg-gradient-to-r from-[#214583] to-[#2b529f] rounded-2xl p-6 text-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <p className="text-blue-100 text-sm font-semibold">Espace commercial</p>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-1">Bonjour {currentUser.prenoms || currentUser.matricule}</h2>
          <p className="text-blue-100 mt-2 text-sm">Suivez vos dossiers et inscrivez les agents souhaitant adherer a l ESR.</p>
        </div>
        <button onClick={onNewAdhesion} className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#df9f28] hover:bg-[#c88d20] text-white rounded-xl font-bold shadow-sm">
          <FilePlus2 className="w-5 h-5" /> Nouvelle adhesion
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Stat label="Dossiers" value={stats.total} icon={<FilePlus2 />} color="text-[#2b529f]" />
        <Stat label="En attente" value={stats.pending} icon={<Clock3 />} color="text-amber-600" />
        <Stat label="Valides" value={stats.validated} icon={<CheckCircle2 />} color="text-emerald-600" />
        <Stat label="Rejetes" value={stats.rejected} icon={<XCircle />} color="text-rose-600" />
        <Stat label="Conversion" value={`${conversion}%`} icon={<TrendingUp />} color="text-violet-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800">Mes adhesions</h3>
            <p className="text-xs text-slate-500 mt-1">Seuls les dossiers que vous avez enregistres sont affiches.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder="Matricule, nom..." className="pl-9 pr-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm" />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value as OnlineAdhesionStatus | 'TOUS')} className="px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm">
              <option value="TOUS">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="VALIDE">Valides</option>
              <option value="REJETE">Rejetes</option>
            </select>
            <button onClick={load} className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50" aria-label="Actualiser"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>

        {error && <div className="m-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-5 py-3">Agent</th><th className="text-left px-5 py-3">Matricule</th><th className="text-left px-5 py-3">Date</th><th className="text-left px-5 py-3">Statut</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!loading && visibleItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-semibold text-slate-800">{item.nom} {item.prenoms}</td><td className="px-5 py-4 font-mono text-slate-600">{item.matricule}</td><td className="px-5 py-4 text-slate-600">{new Date(item.created_at || item.date_souscription).toLocaleDateString('fr-FR')}</td><td className="px-5 py-4"><span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-bold ${statusStyle[item.statut_demande]}`}>{statusLabel[item.statut_demande]}</span></td></tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-12 text-center text-slate-500">Chargement de vos dossiers...</div>}
          {!loading && !visibleItems.length && !error && <div className="p-12 text-center text-slate-400">Aucun dossier trouve.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactElement; color: string }) {
  return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3"><div className={`${color} [&>svg]:w-6 [&>svg]:h-6`}>{icon}</div><div><p className="text-xs uppercase font-bold text-slate-400">{label}</p><p className="text-2xl font-extrabold text-slate-800">{value}</p></div></div>;
}
