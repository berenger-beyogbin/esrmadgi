import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Clock3, Eye, Loader2, RefreshCw, Search, TrendingUp, UserRoundCheck, UsersRound, X, XCircle } from 'lucide-react';
import { CommercialActivity, CommercialActivityRow, OnlineAdhesion, OnlineAdhesionStatus } from '../types';
import { onlineAdhesionService } from '../services/onlineAdhesionService';
import { formatDateFr, formatFCFA } from '../utils/formatters';

const statusLabel: Record<OnlineAdhesionStatus, string> = { EN_ATTENTE: 'En attente', VALIDE: 'Validée', REJETE: 'Rejetée' };
const statusStyle: Record<OnlineAdhesionStatus, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function ActiviteCommerciale() {
  const [data, setData] = useState<CommercialActivity | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<OnlineAdhesion | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    const result = await onlineAdhesionService.commercialActivity();
    setLoading(false);
    if (result.error || !result.data) { setError(result.error?.message || 'Impossible de charger la synthèse commerciale.'); return; }
    setData(result.data);
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr');
    if (!term) return data?.commerciaux ?? [];
    return (data?.commerciaux ?? []).filter((row) => `${row.matricule} ${row.email}`.toLocaleLowerCase('fr').includes(term));
  }, [data, search]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setError(null);
    const result = await onlineAdhesionService.detail(id);
    setDetailLoading(false);
    if (result.error || !result.data) { setError(result.error?.message || "Impossible de charger le détail de l'adhésion."); return; }
    setDetail(result.data);
  };

  const summary = data?.synthese;
  return (
    <div className="space-y-6" id="commercial-activity">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-[#2b529f]">Pilotage du réseau</p><h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mt-1">Activité commerciale</h2><p className="text-sm text-slate-500 mt-2">Synthèse des inscriptions et performances de tous les commerciaux.</p></div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser</button>
      </div>
      {error && <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <Metric label="Commerciaux" value={summary?.commerciaux ?? 0} icon={<UsersRound />} color="text-[#2b529f]" /><Metric label="Actifs" value={summary?.commerciaux_actifs ?? 0} icon={<UserRoundCheck />} color="text-cyan-600" /><Metric label="Dossiers" value={summary?.dossiers ?? 0} icon={<TrendingUp />} color="text-violet-600" /><Metric label="En attente" value={summary?.en_attente ?? 0} icon={<Clock3 />} color="text-amber-600" /><Metric label="Validés" value={summary?.valides ?? 0} icon={<CheckCircle2 />} color="text-emerald-600" /><Metric label="Rejetés" value={summary?.rejetes ?? 0} icon={<XCircle />} color="text-rose-600" /><Metric label="Conversion" value={`${summary?.taux_conversion ?? 0}%`} icon={<TrendingUp />} color="text-indigo-600" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-800">Performance par commercial</h3><p className="text-xs text-slate-500 mt-1">Cliquez sur « Voir les dossiers » pour consulter les adhésions soumises.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Matricule ou email" className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div></div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3 text-left">Commercial</th><th className="px-4 py-3 text-center">Statut</th><th className="px-4 py-3 text-center">Dossiers</th><th className="px-4 py-3 text-center">Attente</th><th className="px-4 py-3 text-center">Validés</th><th className="px-4 py-3 text-center">Rejetés</th><th className="px-4 py-3 text-center">Conversion</th><th className="px-4 py-3 text-left">Dernière activité</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <React.Fragment key={row.id_utilisateur}><CommercialRow row={row} open={expanded === row.id_utilisateur} onToggle={() => setExpanded(expanded === row.id_utilisateur ? null : row.id_utilisateur)} onDetail={openDetail} /></React.Fragment>)}</tbody></table>{loading && <div className="p-12 text-center text-slate-500">Chargement de la synthèse...</div>}{!loading && !rows.length && !error && <div className="p-12 text-center text-slate-400">Aucun commercial trouvé.</div>}</div>
      </div>
      {detailLoading && <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center"><Loader2 className="w-9 h-9 text-white animate-spin" /></div>}
      {detail && <AdhesionDetail item={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function CommercialRow({ row, open, onToggle, onDetail }: { row: CommercialActivityRow; open: boolean; onToggle: () => void; onDetail: (id: string) => void }) {
  return <>
    <tr className="hover:bg-slate-50/70"><td className="px-4 py-4"><p className="font-bold text-slate-800">{row.matricule}</p><p className="text-xs text-slate-500">{row.email}</p></td><td className="px-4 py-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold ${row.actif ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.actif ? 'Actif' : 'Désactivé'}</span></td><td className="px-4 py-4 text-center font-extrabold">{row.total}</td><td className="px-4 py-4 text-center text-amber-700 font-bold">{row.en_attente}</td><td className="px-4 py-4 text-center text-emerald-700 font-bold">{row.valides}</td><td className="px-4 py-4 text-center text-rose-700 font-bold">{row.rejetes}</td><td className="px-4 py-4 text-center font-extrabold text-[#2b529f]">{row.taux_conversion}%</td><td className="px-4 py-4 text-slate-500 whitespace-nowrap">{row.derniere_activite ? new Date(row.derniere_activite).toLocaleString('fr-FR') : '-'}</td><td className="px-4 py-4 text-right"><button onClick={onToggle} disabled={!row.total} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-[#2b529f] text-xs font-bold hover:bg-blue-50 disabled:opacity-40">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Voir les dossiers</button></td></tr>
    {open && <tr><td colSpan={9} className="bg-slate-50 px-5 py-4"><div className="rounded-xl border border-slate-200 bg-white overflow-hidden"><table className="w-full text-xs"><thead className="bg-slate-100 text-slate-500 uppercase"><tr><th className="px-4 py-2 text-left">Soumis le</th><th className="px-4 py-2 text-left">Matricule</th><th className="px-4 py-2 text-left">Adhérent</th><th className="px-4 py-2 text-left">Statut</th><th className="px-4 py-2 text-right">Détails</th></tr></thead><tbody className="divide-y divide-slate-100">{row.dossiers.map((dossier) => <tr key={dossier.id}><td className="px-4 py-3 whitespace-nowrap">{dossier.created_at ? new Date(dossier.created_at).toLocaleString('fr-FR') : '-'}</td><td className="px-4 py-3 font-mono font-bold">{dossier.matricule}</td><td className="px-4 py-3 font-semibold">{dossier.nom} {dossier.prenoms}</td><td className="px-4 py-3"><StatusBadge status={dossier.statut_demande} /></td><td className="px-4 py-3 text-right"><button onClick={() => onDetail(dossier.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[#2b529f] font-bold hover:bg-blue-50"><Eye className="w-4 h-4" /> Détails</button></td></tr>)}</tbody></table></div></td></tr>}
  </>;
}

function AdhesionDetail({ item, onClose }: { item: OnlineAdhesion; onClose: () => void }) {
  const fields: [string, React.ReactNode][] = [['Matricule', item.matricule], ['Nom et prénoms', `${item.nom} ${item.prenoms}`], ['Date de naissance', formatDateFr(item.date_naissance)], ['Téléphone', item.telephone], ['Email', item.email || '-'], ['Direction', item.direction || '-'], ['Emploi / Fonction', item.emploi], ['Grade', item.grade || item.grade_libelle || '-'], ["Date d'adhésion", formatDateFr(item.date_souscription)], ['Premier précompte', item.date_precompte ? formatDateFr(item.date_precompte) : '-'], ['Date de retraite', formatDateFr(item.date_retraite)], ['Cotisation ESR', formatFCFA(item.cotisation_es || 0)]];
  return <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center" onMouseDown={onClose}><div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}><div className="sticky top-0 bg-white border-b border-slate-100 p-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase text-[#2b529f]">Détail de l'adhésion</p><h3 className="text-xl font-extrabold text-slate-800 mt-1">{item.nom} {item.prenoms}</h3><div className="mt-2"><StatusBadge status={item.statut_demande} /></div></div><button onClick={onClose} aria-label="Fermer" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-5 h-5" /></button></div><div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{fields.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3"><p className="text-[11px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800 break-words">{value}</p></div>)}</div><div className="px-5 pb-5 text-right"><button onClick={onClose} className="px-4 py-2 rounded-xl bg-[#2b529f] text-white text-sm font-bold">Fermer</button></div></div></div>;
}

function StatusBadge({ status }: { status: OnlineAdhesionStatus }) { return <span className={`inline-flex px-2 py-1 rounded-full border text-[11px] font-bold ${statusStyle[status]}`}>{statusLabel[status]}</span>; }
function Metric({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactElement; color: string }) { return <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"><div className={`${color} [&>svg]:w-5 [&>svg]:h-5`}>{icon}</div><p className="text-[11px] uppercase font-bold text-slate-400 mt-3">{label}</p><p className="text-2xl font-extrabold text-slate-800">{value}</p></div>; }
