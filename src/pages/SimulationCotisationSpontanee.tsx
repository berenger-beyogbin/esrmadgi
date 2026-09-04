import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, Loader2, Search } from 'lucide-react';
import { cotisationService, SimulationCotisationSpontaneeResult } from '../services/cotisationService';
import { VAdherentComplet } from '../types';
import { formatFCFA } from '../utils/formatters';

const todayISO = () => new Date().toISOString().split('T')[0];

export default function SimulationCotisationSpontanee() {
  const [adherents, setAdherents] = useState<VAdherentComplet[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(todayISO);
  const [result, setResult] = useState<SimulationCotisationSpontaneeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cotisationService.getAdherentsPourCotisation().then(({ data, error: loadError }) => {
      setAdherents(data);
      if (loadError) setError(loadError.message);
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    if (!needle) return adherents;
    return adherents.filter((adherent) =>
      `${adherent.matricule} ${adherent.nom} ${adherent.prenoms}`.toLocaleLowerCase('fr').includes(needle),
    );
  }, [adherents, search]);

  const simulate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    if (!selectedId || Number(montant) <= 0 || !date) {
      setError('Sélectionnez un adhérent, une date et un montant supérieur à zéro.');
      return;
    }
    setLoading(true);
    const response = await cotisationService.simulateCotisationSpontanee({
      id_adherent: Number(selectedId),
      montant: Number(montant),
      date,
    });
    setLoading(false);
    if (response.error) {
      setError(response.error.message);
      return;
    }
    setResult(response.data);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Simulation de cotisation spontanée</h2>
        <p className="text-sm text-slate-600 mt-1">Estimez l'impact d'un versement sans enregistrer de paiement.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_1fr] gap-6">
        <form onSubmit={simulate} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div>
            <label htmlFor="simulation-search" className="block text-sm font-semibold text-slate-600 mb-1">Rechercher un adhérent</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input id="simulation-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Matricule, nom ou prénoms" className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2b529f]" />
            </div>
          </div>

          <div>
            <label htmlFor="simulation-adherent" className="block text-sm font-semibold text-slate-600 mb-1">Adhérent</label>
            <select id="simulation-adherent" value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setResult(null); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2b529f]">
              <option value="">Sélectionner un adhérent</option>
              {filtered.map((adherent) => <option key={adherent.id_adherent} value={adherent.id_adherent}>{adherent.matricule} — {adherent.nom} {adherent.prenoms}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="simulation-montant" className="block text-sm font-semibold text-slate-600 mb-1">Montant spontané envisagé (FCFA)</label>
            <input id="simulation-montant" type="number" min="1" step="1" value={montant} onChange={(event) => { setMontant(event.target.value); setResult(null); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2b529f]" />
          </div>

          <div>
            <label htmlFor="simulation-date" className="block text-sm font-semibold text-slate-600 mb-1">Date de simulation</label>
            <input id="simulation-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setResult(null); }} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2b529f]" />
          </div>

          {error && <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2b529f] text-white rounded-xl font-bold hover:bg-[#1c3e7b] disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Simuler
          </button>
        </form>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          {!result ? (
            <div className="h-full min-h-72 flex flex-col items-center justify-center text-center text-slate-500">
              <Calculator className="w-10 h-10 mb-3 text-slate-300" />
              <p>Saisissez les paramètres pour afficher la simulation.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Résultat de la simulation</h3>
                <p className="text-sm text-slate-500">Matricule {result.matricule}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Result label="Cotisation trimestrielle actuelle" value={formatFCFA(result.cotisationTrimestrielleActuelle)} />
                <Result label="Nouvelle cotisation estimée" value={formatFCFA(result.nouvelleCotisationTrimestrielle)} accent />
                <Result label="Réduction par trimestre" value={formatFCFA(result.reductionTrimestrielle)} />
                <Result label="Versement simulé" value={formatFCFA(result.montantSpontane)} />
                <Result label="Capital acquis avant" value={formatFCFA(result.capitalAcquisAvant)} />
                <Result label="Capital acquis après" value={formatFCFA(result.capitalAcquisApres)} />
                <Result label="Capital restant à constituer" value={formatFCFA(result.capitalRestant)} />
                <Result label="Nombre de trimestres conservé" value={String(result.nombreTrimestres)} />
              </div>
              <div className="flex gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                Simulation indicative uniquement : aucun paiement ni mouvement comptable n'a été enregistré. Le nombre de trimestres contractuel reste inchangé.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Result({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`p-4 rounded-xl border ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}><p className="text-xs font-semibold text-slate-500 uppercase">{label}</p><p className={`mt-1 text-lg font-bold ${accent ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p></div>;
}
