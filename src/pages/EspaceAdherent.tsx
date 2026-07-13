import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  Loader2,
  LogOut,
  Percent,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import logoMadgi from '../assets/logos/logo-madgi.jpg';
import { adherentService } from '../services/adherentService';
import { beneficiaireService } from '../services/beneficiaireService';
import { compteEsrService } from '../services/compteEsrService';
import { cotisationService } from '../services/cotisationService';
import { Beneficiaire, DBUser, VAdherentComplet, VCompteEsrDetails, VCotisationDetails } from '../types';
import { formatDateFr, formatFCFA } from '../utils/formatters';

interface EspaceAdherentProps {
  currentUser: DBUser;
  onSignOut: () => void;
}

type TabKey = 'INFOS' | 'BENEFICIAIRES';

function statusLabel(adherent: VAdherentComplet | null): string {
  if (!adherent) return '-';
  if (adherent.decede) return 'Decede';
  if (adherent.retraite) return 'Retraite';
  return adherent.statut === true || String(adherent.statut).toUpperCase() === 'ACTIF' ? 'En activite' : 'Inactif';
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function EspaceAdherent({ currentUser, onSignOut }: EspaceAdherentProps) {
  const [adherent, setAdherent] = useState<VAdherentComplet | null>(null);
  const [compte, setCompte] = useState<VCompteEsrDetails | null>(null);
  const [cotisations, setCotisations] = useState<VCotisationDetails[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('BENEFICIAIRES');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const adherentId = currentUser.id_adherent ? String(currentUser.id_adherent) : '';

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!adherentId) {
      setErrorMsg('Compte adherent non rattache a une fiche ESR.');
      setIsLoading(false);
      return;
    }

    const [adherentResult, compteResult, cotisationsResult, beneficiairesResult] = await Promise.all([
      adherentService.getAdherentById(adherentId),
      compteEsrService.getCompteByAdherentId(adherentId),
      cotisationService.getCotisationsByAdherentId(adherentId),
      beneficiaireService.getBeneficiairesByAdherent(Number(adherentId)),
    ]);

    const error =
      adherentResult.error ||
      compteResult.error ||
      cotisationsResult.error ||
      beneficiairesResult.error;

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
      return;
    }

    setAdherent(adherentResult.data);
    setCompte(compteResult.data);
    setCotisations(cotisationsResult.data);
    setBeneficiaires(beneficiairesResult.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [adherentId]);

  const cotisationsRows = useMemo(() => {
    let cumul = 0;
    return [...cotisations]
      .sort((a, b) => String(a.periode).localeCompare(String(b.periode)))
      .map((cot) => {
        const montant = toNumber(cot.montant);
        cumul += montant;
        return {
          ...cot,
          interets: 0,
          capitalCumule: cumul,
        };
      })
      .sort((a, b) => String(b.periode).localeCompare(String(a.periode)))
      .slice(0, 8);
  }, [cotisations]);

  const latestDate = compte?.date_calcul || cotisationsRows[0]?.date_valeur || adherent?.date_effet || null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900" id="espace-adherent">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-sm">
        <header className="bg-[#2b529f] text-white px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <img src={logoMadgi} alt="Logo MADGI" className="w-16 h-16 bg-white object-contain p-1 shrink-0" />
            <h1 className="text-lg sm:text-2xl lg:text-3xl uppercase tracking-wide truncate">
              Espace adherent - Compte epargne sante
            </h1>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-white/30 text-sm font-bold hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Se deconnecter</span>
          </button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#f7f7f7]">
          {isLoading ? (
            <div className="min-h-[420px] flex flex-col items-center justify-center text-[#2b529f]">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <span className="font-bold">Chargement de votre espace...</span>
            </div>
          ) : errorMsg ? (
            <div className="p-5 bg-rose-50 border border-rose-200 text-rose-800 rounded text-sm font-bold">
              {errorMsg}
            </div>
          ) : (
            <>
              <section className="bg-white px-5 py-4 border-b border-dashed border-slate-300 flex flex-col md:flex-row justify-between gap-5">
                <div>
                  <h2 className="text-2xl md:text-3xl uppercase tracking-wide">
                    {adherent?.nom} {adherent?.prenoms}
                  </h2>
                  <p className="text-lg text-slate-700 mt-1">{adherent?.matricule}</p>
                  <span className="inline-flex mt-3 px-4 py-2 rounded bg-emerald-600/80 text-white text-sm font-black">
                    {statusLabel(adherent)}
                  </span>
                </div>
                <div className="md:text-right flex flex-col justify-center">
                  <p className="text-sm text-slate-600">Derniere mise a jour</p>
                  <p className="text-lg font-black mt-1">{formatDateFr(latestDate)}</p>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white py-5 px-4 border-b border-dashed border-slate-300">
                <KpiCard label="Capital acquis" value={formatFCFA(compte?.capital_acquis)} date={formatDateFr(compte?.date_calcul)} tone="amber" />
                <KpiCard label="Provision math." value={formatFCFA(compte?.pm)} date={formatDateFr(compte?.date_calcul)} tone="green" />
                <KpiCard label="Valeur de rachat" value={formatFCFA(compte?.valeur_rachat)} date={formatDateFr(compte?.date_calcul)} tone="blue" />
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 shadow-md">
                  <h3 className="text-xl mb-6">Votre contrat en resume</h3>
                  <div className="space-y-4">
                    <SummaryLine icon={<Wallet className="w-5 h-5" />} label="Cotisation annuelle" value={formatFCFA(adherent?.cotisation_annuelle)} />
                    <SummaryLine icon={<ShieldCheck className="w-5 h-5" />} label="Cotisation maladie MADGI garantie" value={formatFCFA(adherent?.cotisation_es)} />
                    <SummaryLine icon={<CalendarDays className="w-5 h-5" />} label="Duree residuelle d'activite" value={`${adherent?.nb_trimestre ?? 0} Trimestre(s)`} />
                    <SummaryLine icon={<Percent className="w-5 h-5" />} label="Age de retraite" value={`${adherent?.age_retraite ?? '-'} ans`} />
                  </div>
                </div>

                <div className="bg-white p-5 shadow-md">
                  <h3 className="text-base font-black text-center mb-4">Capital cumule</h3>
                  <CapitalChart rows={cotisationsRows} />
                </div>
              </section>

              <section className="bg-white p-5 shadow-md">
                <h3 className="text-2xl mb-5">Historiques des cotisations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-slate-800">
                      <tr>
                        <th className="p-3 text-left">Trimestre</th>
                        <th className="p-3 text-left">Montant cotise</th>
                        <th className="p-3 text-left">Interets credites</th>
                        <th className="p-3 text-left">Capital cumule</th>
                        <th className="p-3 text-left">PM</th>
                        <th className="p-3 text-left">Date valeur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cotisationsRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">Aucune cotisation trouvee.</td>
                        </tr>
                      ) : (
                        cotisationsRows.map((cot) => (
                          <tr key={cot.id}>
                            <td className="p-3 font-mono">{cot.periode}</td>
                            <td className="p-3">{formatFCFA(cot.montant)}</td>
                            <td className="p-3">{formatFCFA(cot.interets)}</td>
                            <td className="p-3">{formatFCFA(cot.capitalCumule)}</td>
                            <td className="p-3">{formatFCFA(compte?.pm)}</td>
                            <td className="p-3">{formatDateFr(cot.date_valeur || cot.date_cotisation)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-white p-5 shadow-md">
                <div className="flex border border-slate-200 border-b-0 w-full sm:w-fit">
                  <TabButton active={activeTab === 'INFOS'} onClick={() => setActiveTab('INFOS')}>Informations adherent</TabButton>
                  <TabButton active={activeTab === 'BENEFICIAIRES'} onClick={() => setActiveTab('BENEFICIAIRES')}>Beneficiaires</TabButton>
                </div>
                <div className="border border-slate-200 p-4 overflow-x-auto">
                  {activeTab === 'INFOS' ? (
                    <InfoGrid adherent={adherent} />
                  ) : (
                    <table className="min-w-[720px] text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-3 text-left">Nom et prenoms</th>
                          <th className="p-3 text-left">Lien</th>
                          <th className="p-3 text-left">Part</th>
                          <th className="p-3 text-left">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {beneficiaires.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400">Aucun beneficiaire renseigne.</td>
                          </tr>
                        ) : (
                          beneficiaires.map((benef) => (
                            <tr key={benef.id_beneficiaire}>
                              <td className="p-3">{benef.nom_benef} {benef.prenoms_benef}</td>
                              <td className="p-3">{benef.lien}</td>
                              <td className="p-3">{benef.pourcentage}%</td>
                              <td className="p-3">{benef.statut === false ? 'Inactif' : 'Actif'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <div className="flex justify-center pb-6">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2b529f] text-white rounded font-black hover:bg-[#224783]"
                >
                  <Download className="w-5 h-5" />
                  Telecharger PDF
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, value, date, tone }: { label: string; value: string; date: string; tone: 'amber' | 'green' | 'blue' }) {
  const tones = {
    amber: 'bg-[#efb24f]',
    green: 'bg-[#75b58b]',
    blue: 'bg-[#5b83e6]',
  };
  return (
    <div className={`${tones[tone]} min-h-32 text-white rounded-lg shadow-md flex flex-col justify-center items-center text-center px-4`}>
      <p className="uppercase underline underline-offset-4 text-sm sm:text-base">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-4">{value}</p>
      <p className="text-sm font-semibold mt-2">{date}</p>
    </div>
  );
}

function SummaryLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-center gap-3 bg-white border border-slate-100 shadow-md px-4 py-4">
      <span className="text-[#5b83e6]">{icon}</span>
      <span className="text-slate-700">{label}</span>
      <span className="font-black text-right">{value}</span>
    </div>
  );
}

function CapitalChart({ rows }: { rows: Array<VCotisationDetails & { capitalCumule: number }> }) {
  const points = rows.slice().reverse().slice(-4);
  const max = Math.max(...points.map((row) => row.capitalCumule), 1);

  if (points.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Aucune donnee disponible.</div>;
  }

  const polygonPoints = points
    .map((row, index) => {
      const x = points.length === 1 ? 50 : 8 + (index * 84) / (points.length - 1);
      const y = 86 - (row.capitalCumule / max) * 70;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `8,92 ${polygonPoints} 92,92`;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-64" preserveAspectRatio="none">
      <line x1="8" y1="18" x2="92" y2="18" stroke="#e2e8f0" strokeWidth="0.7" />
      <line x1="8" y1="50" x2="92" y2="50" stroke="#e2e8f0" strokeWidth="0.7" />
      <line x1="8" y1="92" x2="92" y2="92" stroke="#cbd5e1" strokeWidth="0.9" />
      <polygon points={areaPoints} fill="#93c5fd" opacity="0.95" />
      <polyline points={polygonPoints} fill="none" stroke="#5b83e6" strokeWidth="1.2" />
      {points.map((row, index) => {
        const x = points.length === 1 ? 50 : 8 + (index * 84) / (points.length - 1);
        const y = 86 - (row.capitalCumule / max) * 70;
        return (
          <text key={row.id} x={x} y={Math.max(y + 10, 20)} fill="white" fontSize="4.8" fontWeight="900" textAnchor="middle">
            {new Intl.NumberFormat('fr-FR').format(row.capitalCumule)}
          </text>
        );
      })}
    </svg>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 text-sm sm:text-base font-bold border-r border-slate-200 ${
        active ? 'bg-[#2b529f] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function InfoGrid({ adherent }: { adherent: VAdherentComplet | null }) {
  const rows = [
    ['Matricule', adherent?.matricule],
    ['Civilite', adherent?.civilite],
    ['Nom', adherent?.nom],
    ['Prenoms', adherent?.prenoms],
    ['Date de naissance', formatDateFr(adherent?.date_naissance)],
    ['Telephone', adherent?.telephone],
    ['Email', adherent?.email],
    ['Emploi', adherent?.emploi],
    ['Grade', adherent?.grade_libelle || adherent?.grade_code],
    ['Date retraite', formatDateFr(adherent?.date_retraite)],
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-3">
          <UserRound className="w-4 h-4 text-[#2b529f] shrink-0" />
          <div>
            <p className="text-xs uppercase font-black text-slate-500">{label}</p>
            <p className="font-bold text-slate-800">{value || '-'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
