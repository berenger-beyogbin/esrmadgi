import React, { useEffect, useState } from 'react';
import { auditService } from '../services/auditService';
import { AuditLog, DBUser } from '../types';
import { Shield, Search, RefreshCw, Filter, Calendar, Terminal } from 'lucide-react';

interface AuditProps {
  currentUser: DBUser;
}

export default function Audit({ currentUser }: AuditProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [action, setAction] = useState('');
  const [utilisateur, setUtilisateur] = useState('');
  const [objetAudit, setObjetAudit] = useState('');
  const [date, setDate] = useState('');

  const fetchLogs = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await auditService.getAuditLogs({
        action: action.trim() || undefined,
        utilisateur: utilisateur.trim() || undefined,
        objetAudit: objetAudit.trim() || undefined,
        date: date || undefined,
      });

      if (error) throw error;
      setLogs(data || []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Erreur lors de la récupération des journaux d\'audit.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [date]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchLogs();
    }
  };

  const handleClearFilters = () => {
    setAction('');
    setUtilisateur('');
    setObjetAudit('');
    setDate('');
    // Wait for state updates then fetch
    setTimeout(fetchLogs, 50);
  };

  const formatFrenchDate = (dStr: string) => {
    if (!dStr) return '-';
    try {
      // Return beautiful readable date & time
      const dateObj = new Date(dStr);
      return dateObj.toLocaleString('fr-FR');
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6" id="audit-logs-container">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm font-sans">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Registre d'Audit & Sécurité
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Traçabilité des opérations de gestion de la MADGI.
          </p>
        </div>
      </div>

      {/* Audit Filtering form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Action Code input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">Action Code (Entrée)</label>
            <input
              id="input-audit-action"
              type="text"
              placeholder="Ex: CREATION_ADHERENT"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-slate-705 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all uppercase font-semibold font-mono"
            />
          </div>

          {/* User input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">Opérateur / Utilisateur</label>
            <input
              id="input-audit-user"
              type="text"
              placeholder="Ex: diallo@madgi.ci"
              value={utilisateur}
              onChange={(e) => setUtilisateur(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-slate-705 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            />
          </div>

          {/* Object input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">Objet d'Audit / Table</label>
            <input
              id="input-audit-object"
              type="text"
              placeholder="Ex: adherents"
              value={objetAudit}
              onChange={(e) => setObjetAudit(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-slate-705 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-mono"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 font-mono">Date de l'événement</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-slate-705 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-slate-705 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            id="btn-audit-clear"
            onClick={handleClearFilters}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-semibold rounded-lg"
          >
            Réinitialiser
          </button>

          <button
            id="btn-audit-refresh"
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Logs Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-xs font-medium">Chargement des historiques d'audits...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-xs">Aucun événement enregistré ne correspond à ces filtres.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-x-auto p-4 font-mono text-[11px] text-slate-300">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3 text-slate-400">
            <span className="flex items-center gap-1">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>TERMINAL SYSTEME - JOURNALISATION MADGI SECURITY</span>
            </span>
            <span>{logs.length} Événement(s)</span>
          </div>

          <table className="min-w-full divide-y divide-slate-800 text-left" id="tbl-audit-logs">
            <thead>
              <tr className="text-slate-550 header-styled-dark font-bold text-[10px]">
                <th className="py-2.5 px-3">Date Event</th>
                <th className="py-2.5 px-3 text-emerald-400">Action Code</th>
                <th className="py-2.5 px-3">Utilisateur</th>
                <th className="py-2.5 px-3">Objet / Table</th>
                <th className="py-2.5 px-3">Détails d'exécution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/20 text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition duration-100">
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                    {formatFrenchDate(log.date)}
                  </td>
                  <td className="py-3 px-3 font-bold text-emerald-500 select-all whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-3 px-3 text-indigo-400 whitespace-nowrap">
                    {log.utilisateur}
                  </td>
                  <td className="py-3 px-3 text-amber-500 font-semibold whitespace-nowrap">
                    {log.objet_audit}
                  </td>
                  <td className="py-3 px-3 text-slate-350 leading-relaxed max-w-sm font-sans" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
