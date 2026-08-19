import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CircleHelp,
  Download,
  FileText,
  Loader2,
  LogOut,
  Percent,
  ShieldCheck,
  Users,
  UserRound,
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
  adherentIdOverride?: string;
  previewMode?: boolean;
}

type TabKey = 'INFOS' | 'BENEFICIAIRES';

function nextPeriode(periode?: string): string | null {
  const match = String(periode ?? '').match(/^(\d{4})T([1-4])$/);
  if (!match) return null;
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  return quarter === 4 ? `${year + 1}T1` : `${year}T${quarter + 1}`;
}

function cotisationStatus(status?: string): { label: string; className: string } {
  const normalized = String(status ?? '').toUpperCase();
  if (['VALIDE', 'ENCAISSE', 'ENCAISSEE'].includes(normalized)) return { label: 'Encaissée', className: 'bg-emerald-100 text-emerald-800' };
  if (normalized === 'REJETE') return { label: 'Rejetée', className: 'bg-rose-100 text-rose-800' };
  return { label: 'En traitement', className: 'bg-amber-100 text-amber-800' };
}

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

function cotisationDate(cotisation: VCotisationDetails): string {
  return String(cotisation.date_valeur || cotisation.date_cotisation || '');
}

export default function EspaceAdherent({ currentUser, onSignOut, adherentIdOverride, previewMode = false }: EspaceAdherentProps) {
  const [adherent, setAdherent] = useState<VAdherentComplet | null>(null);
  const [compte, setCompte] = useState<VCompteEsrDetails | null>(null);
  const [cotisations, setCotisations] = useState<VCotisationDetails[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('BENEFICIAIRES');
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const adherentId = adherentIdOverride || (currentUser.id_adherent ? String(currentUser.id_adherent) : '');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!adherentId) {
      setErrorMsg('Compte adherent non rattache a une fiche ESR.');
      setIsLoading(false);
      return;
    }

    const [adherentResult, initialCompteResult, cotisationsResult, beneficiairesResult] = await Promise.all([
      adherentService.getAdherentById(adherentId),
      compteEsrService.getCompteByAdherentId(adherentId),
      cotisationService.getCotisationsByAdherentId(adherentId),
      beneficiaireService.getBeneficiairesByAdherent(Number(adherentId)),
    ]);

    const error =
      adherentResult.error ||
      initialCompteResult.error ||
      cotisationsResult.error ||
      beneficiairesResult.error;

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
      return;
    }

    const cotisationsEncaissees = cotisationsResult.data.filter((cotisation) => {
      const statut = String(cotisation.statut_detail || cotisation.statut || '').toUpperCase();
      return statut === 'ENCAISSEE' || statut === 'ENCAISSE';
    });
    const derniereDateEncaissement = cotisationsEncaissees
      .map(cotisationDate)
      .filter(Boolean)
      .sort()
      .at(-1);
    let compteData = initialCompteResult.data;
    if (derniereDateEncaissement && (!compteData?.date_calcul || derniereDateEncaissement > compteData.date_calcul)) {
      const recalculResult = await compteEsrService.recalculerCompte(adherentId, derniereDateEncaissement);
      if (!recalculResult.error && recalculResult.data) compteData = recalculResult.data;
    }

    setAdherent(adherentResult.data);
    setCompte(compteData);
    setCotisations(cotisationsEncaissees);
    setBeneficiaires(beneficiairesResult.data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [adherentId]);

  const handleDownloadReleve = async () => {
    if (!adherentId || isDownloading) return;
    setIsDownloading(true);
    setErrorMsg(null);
    const { data, error } = await compteEsrService.telechargerReleveCompte(adherentId);
    setIsDownloading(false);
    if (error || !data) {
      setErrorMsg(error?.message || 'Relevé de compte indisponible.');
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `releve-compte-esr-${adherent?.matricule || 'adherent'}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cotisationsEffectuees = useMemo(
    () => cotisations.filter((cotisation) => {
      const statut = String(cotisation.statut_detail || cotisation.statut || '').toUpperCase();
      return statut === 'ENCAISSEE' || statut === 'ENCAISSE';
    }),
    [cotisations],
  );

  const cotisationsRows = useMemo(() => {
    let cumul = 0;
    return [...cotisationsEffectuees]
      .sort((a, b) => {
        const byDate = cotisationDate(a).localeCompare(cotisationDate(b));
        if (byDate !== 0) return byDate;
        const byPeriode = String(a.periode).localeCompare(String(b.periode));
        if (byPeriode !== 0) return byPeriode;
        return String(a.id).localeCompare(String(b.id));
      })
      .map((cot) => {
        const montant = toNumber(cot.montant);
        cumul += montant;
        return {
          ...cot,
          interets: 0,
          capitalCumule: cumul,
        };
      })
      .sort((a, b) => {
        const byDate = cotisationDate(b).localeCompare(cotisationDate(a));
        if (byDate !== 0) return byDate;
        return String(b.id).localeCompare(String(a.id));
      })
  }, [cotisationsEffectuees]);

  const cotisationsChartRows = useMemo(() => {
    const parPeriode = new Map<string, { cotisation: VCotisationDetails; montant: number }>();

    cotisationsEffectuees.forEach((cotisation) => {
      const periode = String(cotisation.periode || '').trim();
      const key = periode || `operation-${cotisation.id}`;
      const existing = parPeriode.get(key);

      if (!existing) {
        parPeriode.set(key, {
          cotisation,
          montant: toNumber(cotisation.montant),
        });
        return;
      }

      existing.montant += toNumber(cotisation.montant);
      if (cotisationDate(cotisation) > cotisationDate(existing.cotisation)) {
        existing.cotisation = cotisation;
      }
    });

    let cumul = 0;
    return Array.from(parPeriode.values())
      .sort((a, b) => {
        const byPeriode = String(a.cotisation.periode).localeCompare(String(b.cotisation.periode));
        if (byPeriode !== 0) return byPeriode;
        return cotisationDate(a.cotisation).localeCompare(cotisationDate(b.cotisation));
      })
      .map(({ cotisation, montant }) => {
        cumul += montant;
        return {
          ...cotisation,
          montant,
          interets: 0,
          capitalCumule: cumul,
        };
      })
      .sort((a, b) => String(b.periode).localeCompare(String(a.periode)));
  }, [cotisationsEffectuees]);

  const displayedCotisations = cotisationsRows.slice(0, 8);
  const derniereCotisation = cotisationsRows[0] ?? null;
  const dernierStatut = cotisationStatus(derniereCotisation?.statut_detail || derniereCotisation?.statut);
  const prochainePeriode = nextPeriode(derniereCotisation?.periode);

  const latestDate = [compte?.date_calcul, derniereCotisation ? cotisationDate(derniereCotisation) : '', adherent?.date_effet]
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900" id="espace-adherent">
      <div className="max-w-7xl mx-auto bg-white min-h-screen shadow-sm">
        <header className="bg-[#2b529f] text-white px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <img src={logoMadgi} alt="Logo MADGI" className="w-16 h-16 bg-white object-contain p-1 shrink-0" />
            <h1 className="text-lg sm:text-2xl lg:text-3xl uppercase tracking-wide truncate">
              {previewMode ? 'Fiche individuelle adhérent' : 'Espace adherent - Compte epargne sante'}
            </h1>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded border border-white/30 text-sm font-bold hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{previewMode ? 'Fermer' : 'Se deconnecter'}</span>
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
              <section className="bg-white px-5 py-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-5">
                <div>
                  <h2 className="text-2xl md:text-3xl uppercase tracking-wide">
                    {adherent?.nom} {adherent?.prenoms}
                  </h2>
                  <p className="text-lg text-slate-700 mt-1">{adherent?.matricule}</p>
                  <span className="inline-flex mt-3 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-black">
                    {statusLabel(adherent)}
                  </span>
                </div>
                <div className="md:text-right flex flex-col justify-center">
                  <p className="text-sm text-slate-600">Derniere mise a jour</p>
                  <p className="text-lg font-black mt-1">{formatDateFr(latestDate)}</p>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 bg-[#edf4ff] border border-blue-200 rounded-xl p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#2b529f]">Situation de votre compte</p>
                  {derniereCotisation ? (
                    <p className="mt-2 text-slate-800">
                      Dernière cotisation : <strong>{formatFCFA(derniereCotisation.montant)}</strong> pour <strong>{derniereCotisation.periode}</strong>.
                      {prochainePeriode && <> Prochaine période indicative : <strong>{prochainePeriode}</strong>.</>}
                    </p>
                  ) : (
                    <p className="mt-2 text-slate-700">Aucune cotisation n'est encore enregistrée sur votre compte.</p>
                  )}
                </div>
                {derniereCotisation && (
                  <span className={`self-center inline-flex px-4 py-2 rounded-full text-sm font-black ${dernierStatut.className}`}>
                    {dernierStatut.label}
                  </span>
                )}
              </section>

              {beneficiaires.length === 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Attention :</strong> aucun bénéficiaire n'est enregistré. Contactez la mutuelle pour compléter votre dossier.
                </div>
              )}

              <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <KpiCard label="Capital acquis" value={formatFCFA(compte?.capital_acquis)} date={formatDateFr(compte?.date_calcul)} description="Valeur de l'épargne constituée retenue dans votre compte." tone="amber" />
                <KpiCard label="Provision mathématique" value={formatFCFA(compte?.pm)} date={formatDateFr(compte?.date_calcul)} description="Valeur actualisée calculée selon les paramètres du régime." tone="green" />
                <KpiCard label="Valeur de rachat estimative" value={formatFCFA(compte?.valeur_rachat)} date={formatDateFr(compte?.date_calcul)} description="Montant estimatif avant validation d'une demande de rachat." tone="blue" />
              </section>

              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-black text-slate-800">Actions rapides</h3>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ActionButton icon={isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />} onClick={handleDownloadReleve}>Télécharger mon relevé</ActionButton>
                  <ActionButton icon={<Users className="w-5 h-5" />} onClick={() => { setActiveTab('BENEFICIAIRES'); document.getElementById('details-adherent')?.scrollIntoView({ behavior: 'smooth' }); }}>Voir mes bénéficiaires</ActionButton>
                  <ActionButton icon={<CircleHelp className="w-5 h-5" />} onClick={() => document.getElementById('historique-cotisations')?.scrollIntoView({ behavior: 'smooth' })}>Vérifier mes cotisations</ActionButton>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 shadow-md">
                  <h3 className="text-xl mb-6">Votre contrat en resume</h3>
                  <div className="space-y-4">
                    <SummaryLine icon={<ShieldCheck className="w-5 h-5" />} label="Cotisation maladie MADGI garantie" value={formatFCFA(adherent?.cotisation_es)} />
                    <SummaryLine icon={<CalendarDays className="w-5 h-5" />} label="Duree residuelle d'activite" value={`${adherent?.nb_trimestre ?? 0} Trimestre(s)`} />
                    <SummaryLine icon={<Percent className="w-5 h-5" />} label="Age de retraite" value={`${adherent?.age_retraite ?? '-'} ans`} />
                  </div>
                </div>

                <div className="bg-white p-5 shadow-md">
                  <h3 className="text-base font-black text-center">Progression du total cotisé</h3>
                  <p className="text-xs text-slate-500 text-center mt-1 mb-4">Uniquement les cotisations effectivement encaissées</p>
                  <CapitalChart rows={cotisationsChartRows} />
                </div>
              </section>

              <section id="historique-cotisations" className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm scroll-mt-4">
                <h3 className="text-xl sm:text-2xl mb-1">Historique des cotisations</h3>
                <p className="text-sm text-slate-500 mb-5">Les 8 opérations les plus récentes enregistrées sur votre compte.</p>

                <div className="lg:hidden space-y-3">
                  {displayedCotisations.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                      Aucune cotisation trouvée.
                    </div>
                  ) : displayedCotisations.map((cot) => {
                    const status = cotisationStatus(cot.statut_detail || cot.statut);
                    return (
                      <article key={cot.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-100">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">Trimestre</p>
                            <p className="font-mono text-lg font-black text-slate-800">{cot.periode}</p>
                          </div>
                          <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
                          <MobileValue label="Montant cotisé" value={formatFCFA(cot.montant)} strong />
                          <MobileValue label="Total cotisé" value={formatFCFA(cot.capitalCumule)} />
                          <div className="col-span-2 pt-3 border-t border-slate-100">
                            <MobileValue label="Date d'encaissement" value={formatDateFr(cot.date_valeur || cot.date_cotisation)} />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-slate-800">
                      <tr>
                        <th className="p-3 text-left">Trimestre</th>
                        <th className="p-3 text-left">Montant cotisé</th>
                        <th className="p-3 text-left">Total cotisé</th>
                        <th className="p-3 text-left">Statut</th>
                        <th className="p-3 text-left">Date d'encaissement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cotisationsRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">Aucune cotisation trouvée.</td>
                        </tr>
                      ) : (
                        displayedCotisations.map((cot) => (
                          <tr key={cot.id}>
                            <td className="p-3 font-mono">{cot.periode}</td>
                            <td className="p-3">{formatFCFA(cot.montant)}</td>
                            <td className="p-3">{formatFCFA(cot.capitalCumule)}</td>
                            <td className="p-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${cotisationStatus(cot.statut_detail || cot.statut).className}`}>{cotisationStatus(cot.statut_detail || cot.statut).label}</span></td>
                            <td className="p-3">{formatDateFr(cot.date_valeur || cot.date_cotisation)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section id="details-adherent" className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm scroll-mt-4">
                <div className="grid grid-cols-2 border border-slate-200 border-b-0 w-full sm:flex sm:w-fit">
                  <TabButton active={activeTab === 'INFOS'} onClick={() => setActiveTab('INFOS')}>Informations adherent</TabButton>
                  <TabButton active={activeTab === 'BENEFICIAIRES'} onClick={() => setActiveTab('BENEFICIAIRES')}>Beneficiaires</TabButton>
                </div>
                <div className="border border-slate-200 p-3 sm:p-4">
                  {activeTab === 'INFOS' ? (
                    <InfoGrid adherent={adherent} />
                  ) : (
                    <>
                    <div className="lg:hidden space-y-3">
                      {beneficiaires.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">Aucun bénéficiaire renseigné.</div>
                      ) : beneficiaires.map((benef) => {
                        const isActive = benef.statut !== false;
                        return (
                          <article key={benef.id_beneficiaire} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <div className="flex items-start justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-100">
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">Bénéficiaire</p>
                                <p className="mt-1 font-black text-slate-800 break-words">{benef.nom_benef} {benef.prenoms_benef}</p>
                              </div>
                              <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                {isActive ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 p-4">
                              <MobileValue label="Lien" value={benef.lien || '-'} />
                              <MobileValue label="Part attribuée" value={`${benef.pourcentage}%`} strong />
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full text-sm">
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
                    </div>
                    </>
                  )}
                </div>
              </section>

              <div className="flex justify-center pb-6">
                <button
                  onClick={handleDownloadReleve}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2b529f] text-white rounded font-black hover:bg-[#224783]"
                >
                  {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {isDownloading ? 'Génération en cours...' : 'Télécharger mon relevé de compte'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function KpiCard({ label, value, date, description, tone }: { label: string; value: string; date: string; description: string; tone: 'amber' | 'green' | 'blue' }) {
  const tones = {
    amber: 'bg-[#efb24f]',
    green: 'bg-[#75b58b]',
    blue: 'bg-[#5b83e6]',
  };
  return (
    <div className={`${tones[tone]} min-h-44 text-white rounded-xl shadow-md flex flex-col justify-center items-center text-center px-5 py-5`}>
      <p className="uppercase text-sm sm:text-base font-black">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-3">{value}</p>
      <p className="text-xs font-semibold mt-1 opacity-90">Calcul au {date}</p>
      <p className="text-xs leading-relaxed mt-3 max-w-xs opacity-95">{description}</p>
    </div>
  );
}

function ActionButton({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:border-[#2b529f] hover:bg-blue-50 hover:text-[#2b529f] transition">
      <span className="text-[#2b529f]">{icon}</span>
      {children}
    </button>
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

function MobileValue({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm break-words ${strong ? 'font-black text-[#2b529f]' : 'font-bold text-slate-800'}`}>
        {value}
      </p>
    </div>
  );
}

function CapitalChart({ rows }: { rows: Array<VCotisationDetails & { capitalCumule: number }> }) {
  const points = rows.slice().reverse().slice(-6);

  if (points.length === 0) {
    return <div className="h-52 flex items-center justify-center text-slate-400 text-sm">Aucune cotisation encaissée.</div>;
  }

  if (points.length === 1) {
    const cotisation = points[0];
    return (
      <div className="h-52 flex items-center justify-center">
        <div className="w-full max-w-sm rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
          <p className="text-sm font-bold text-slate-600">1 cotisation encaissée</p>
          <p className="mt-2 text-3xl font-black text-[#2b529f]">{formatFCFA(cotisation.montant)}</p>
          <p className="mt-2 text-sm text-slate-600">Période {cotisation.periode}</p>
          <p className="mt-1 text-xs text-slate-500">Total cotisé : {formatFCFA(cotisation.capitalCumule)}</p>
        </div>
      </div>
    );
  }

  const max = Math.max(...points.map((row) => row.capitalCumule), 1);

  return (
    <div className="pt-4">
      <div className="h-52 flex items-end justify-around gap-2 sm:gap-4 border-b border-slate-300 px-2">
        {points.map((row) => (
          <div key={row.id} className="h-full flex-1 min-w-0 flex flex-col justify-end items-center group">
            <span className="mb-2 text-[10px] sm:text-xs font-black text-[#2b529f] whitespace-nowrap">
              {formatFCFA(row.capitalCumule)}
            </span>
            <div
              className="w-full max-w-16 rounded-t-md bg-[#5b83e6] group-hover:bg-[#2b529f] transition-colors"
              style={{ height: `${Math.max(16, (row.capitalCumule / max) * 78)}%` }}
              title={`${row.periode} : total cotisé ${formatFCFA(row.capitalCumule)}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-2 sm:gap-4 px-2 pt-2">
        {points.map((row) => (
          <span key={row.id} className="flex-1 min-w-0 text-center text-[10px] sm:text-xs font-bold text-slate-600">
            {row.periode}
          </span>
        ))}
      </div>
      <p className="mt-4 text-center text-sm font-bold text-slate-700">
        Total actuel : {formatFCFA(points[points.length - 1].capitalCumule)}
      </p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-w-0 px-2 sm:px-6 py-3 text-xs sm:text-base font-bold border-r border-slate-200 break-words ${
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
