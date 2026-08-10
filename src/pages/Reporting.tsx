import React, { useEffect, useMemo, useState } from 'react';
import { DBUser } from '../types';
import {
  AdherentReportRow,
  AgentDecedeReportRow,
  CimaC20Report,
  RachatReportRow,
  exporterCimaC20,
  exporterTableauExcel,
  getAdherentsActifs,
  getAdherentsRetraites,
  getAdherentsRetraitesParStatut,
  getAgentsDecedes,
  getAgentsDecedesCapitalVerse,
  getCimaC20,
  getListeAdherents,
  getRachatsResiliations,
} from '../services/reportingService';
import { formatDateFr, formatFCFA } from '../utils/formatters';
import { ScrollableTableWrapper } from '../components/common/ScrollableTableWrapper';
import Audit from './Audit';
import { Download, FileBarChart2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

interface ReportingProps {
  currentUser: DBUser;
}

const STATUT_STYLES: Record<string, string> = {
  A_JOUR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAS_A_JOUR: 'bg-rose-50 text-rose-700 border-rose-200',
};

type EtatId =
  | 'ADHERENTS'
  | 'ADHERENTS_ACTIFS'
  | 'ADHERENTS_RETRAITES'
  | 'ADHERENTS_RETRAITES_STATUT'
  | 'RACHATS'
  | 'AGENTS_DECEDES'
  | 'AGENTS_DECEDES_CAPITAL'
  | 'CIMA_C20'
  | 'COTISATIONS_PERIODE'
  | 'CAPITAL_RENTE'
  | 'CAPITAL_RESTANT_DU'
  | 'CAPITAL_DECES'
  | 'PROVISIONS_GLOBALES'
  | 'MOUVEMENTS_FLUX'
  | 'AVIS_ANNUEL';

interface EtatDef {
  id: EtatId;
  label: string;
  categorie: 'Listes' | 'Montants' | 'Autres';
  disponible: boolean;
}

const ETATS: EtatDef[] = [
  { id: 'ADHERENTS', label: 'Liste des adhérents', categorie: 'Listes', disponible: true },
  { id: 'ADHERENTS_ACTIFS', label: 'Adhérents en activité', categorie: 'Listes', disponible: true },
  { id: 'ADHERENTS_RETRAITES', label: 'Adhérents retraités', categorie: 'Listes', disponible: true },
  { id: 'ADHERENTS_RETRAITES_STATUT', label: 'Adhérents retraités par statut', categorie: 'Listes', disponible: true },
  { id: 'RACHATS', label: 'Rachats et résiliations', categorie: 'Listes', disponible: true },
  { id: 'AGENTS_DECEDES', label: 'Agents décédés', categorie: 'Listes', disponible: true },
  { id: 'AGENTS_DECEDES_CAPITAL', label: "Décès — capital versé aux ayants droit", categorie: 'Listes', disponible: true },
  { id: 'CIMA_C20', label: 'État CIMA C-20', categorie: 'Montants', disponible: true },
  { id: 'COTISATIONS_PERIODE', label: 'Cotisations encaissées sur une période', categorie: 'Montants', disponible: false },
  { id: 'CAPITAL_RENTE', label: 'Capital constitutif de rente par adhérent', categorie: 'Montants', disponible: false },
  { id: 'CAPITAL_RESTANT_DU', label: 'Capital restant dû par retraité', categorie: 'Montants', disponible: false },
  { id: 'CAPITAL_DECES', label: 'Capital décès/invalidité par adhérent', categorie: 'Montants', disponible: false },
  { id: 'PROVISIONS_GLOBALES', label: 'Provisions globales & flux de rentes', categorie: 'Montants', disponible: false },
  { id: 'MOUVEMENTS_FLUX', label: 'Mouvements de flux (entrants/sortants)', categorie: 'Montants', disponible: false },
  { id: 'AVIS_ANNUEL', label: 'Avis annuel adhérents', categorie: 'Autres', disponible: false },
];

const CATEGORIES: EtatDef['categorie'][] = ['Listes', 'Montants', 'Autres'];

type Ligne = AdherentReportRow | RachatReportRow | AgentDecedeReportRow;

interface ColonneVue {
  header: string;
  key: string;
  format?: 'money' | 'date';
  width?: number;
}

function colonnesPour(id: EtatId): ColonneVue[] {
  switch (id) {
    case 'ADHERENTS':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Date de 1er précompte', key: 'datePremierPrecompte', format: 'date', width: 18 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Statut', key: 'statut', width: 14 },
      ];
    case 'ADHERENTS_ACTIFS':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Date de 1er précompte', key: 'datePremierPrecompte', format: 'date', width: 18 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
      ];
    case 'ADHERENTS_RETRAITES':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Date de départ retraite', key: 'dateDepartRetraite', format: 'date', width: 18 },
      ];
    case 'ADHERENTS_RETRAITES_STATUT':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Grade', key: 'grade', width: 16 },
        { header: "Date d'Adhésion", key: 'dateAdhesion', format: 'date', width: 16 },
        { header: 'Prime Trimestrielle', key: 'primeTrimestrielle', format: 'money', width: 18 },
        { header: 'Date de départ retraite', key: 'dateDepartRetraite', format: 'date', width: 18 },
        { header: 'Montant restant dû', key: 'montantRestantDu', format: 'money', width: 18 },
        { header: 'Statut', key: 'statut', width: 14 },
      ];
    case 'RACHATS':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date de demande', key: 'dateDemande', format: 'date', width: 16 },
        { header: 'Statut', key: 'statut', width: 16 },
        { header: 'Capital versé', key: 'capitalVerse', format: 'money', width: 18 },
        { header: 'Pénalité', key: 'penalite', format: 'money', width: 16 },
        { header: 'Montant net', key: 'montantNet', format: 'money', width: 18 },
      ];
    case 'AGENTS_DECEDES':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date événement', key: 'dateEvenement', format: 'date', width: 16 },
        { header: 'Date demande', key: 'dateDemande', format: 'date', width: 16 },
        { header: 'Statut dossier', key: 'statut', width: 16 },
        { header: 'Montant dû', key: 'montantDu', format: 'money', width: 18 },
        { header: 'Montant payé', key: 'montantPaye', format: 'money', width: 18 },
      ];
    case 'AGENTS_DECEDES_CAPITAL':
      return [
        { header: 'Matricule', key: 'matricule', width: 14 },
        { header: 'Nom et Prénoms', key: 'nomPrenoms', width: 28 },
        { header: 'Date événement', key: 'dateEvenement', format: 'date', width: 16 },
        { header: 'Date paiement', key: 'datePaiement', format: 'date', width: 16 },
        { header: 'Montant payé', key: 'montantPaye', format: 'money', width: 18 },
        { header: 'Ayants droit', key: 'ayantsDroit', width: 32 },
      ];
    default:
      return [];
  }
}

async function chargerLignes(id: EtatId): Promise<Ligne[]> {
  switch (id) {
    case 'ADHERENTS':
      return getListeAdherents();
    case 'ADHERENTS_ACTIFS':
      return getAdherentsActifs();
    case 'ADHERENTS_RETRAITES':
      return getAdherentsRetraites();
    case 'ADHERENTS_RETRAITES_STATUT':
      return getAdherentsRetraitesParStatut();
    case 'RACHATS':
      return getRachatsResiliations();
    case 'AGENTS_DECEDES':
      return getAgentsDecedes();
    case 'AGENTS_DECEDES_CAPITAL':
      return getAgentsDecedesCapitalVerse();
    default:
      return [];
  }
}

function formaterCellule(valeur: unknown, format?: 'money' | 'date'): string {
  if (valeur === null || valeur === undefined || valeur === '') return '-';
  if (format === 'money') return formatFCFA(Number(valeur));
  if (format === 'date') return formatDateFr(String(valeur));
  return String(valeur);
}

export default function Reporting({ currentUser }: ReportingProps) {
  const peutVoirAudit = currentUser.role === 'ADMINISTRATEUR' || currentUser.role === 'SUPERADMIN';
  const [ongletPrincipal, setOngletPrincipal] = useState<'ETATS' | 'AUDIT'>('ETATS');
  const [etatActif, setEtatActif] = useState<EtatId>('ADHERENTS');
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [annee, setAnnee] = useState<number>(new Date().getFullYear());
  const [rapportCima, setRapportCima] = useState<CimaC20Report | null>(null);
  const [exportEnCours, setExportEnCours] = useState(false);

  const definition = useMemo(() => ETATS.find((e) => e.id === etatActif), [etatActif]);
  const colonnes = useMemo(() => colonnesPour(etatActif), [etatActif]);

  const chargerCima = async () => {
    setIsLoading(true);
    setErreur(null);
    try {
      const rapport = await getCimaC20(annee);
      setRapportCima(rapport);
    } catch (e: any) {
      setErreur(e?.message || "Erreur lors du chargement de l'état CIMA C-20.");
      setRapportCima(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ongletPrincipal !== 'ETATS') return;
    if (!definition?.disponible) return;
    if (etatActif === 'CIMA_C20') {
      chargerCima();
      return;
    }
    setIsLoading(true);
    setErreur(null);
    chargerLignes(etatActif)
      .then((rows) => setLignes(rows))
      .catch((e: any) => {
        setErreur(e?.message || "Erreur lors du chargement de l'état.");
        setLignes([]);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etatActif, ongletPrincipal, annee]);

  const handleExportExcel = async () => {
    if (!definition) return;
    setExportEnCours(true);
    try {
      if (etatActif === 'CIMA_C20') {
        await exporterCimaC20(annee);
        return;
      }
      await exporterTableauExcel({
        titre: definition.label.toUpperCase(),
        sousTitre: `Généré le ${formatDateFr(new Date().toISOString())}`,
        colonnes: colonnes.map((c) => ({ header: c.header, key: c.key, width: c.width, format: c.format })),
        lignes: lignes as unknown as Array<Record<string, unknown>>,
        fichier: `${definition.label.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`,
      });
    } catch (e: any) {
      setErreur(e?.message || "Erreur lors de l'export Excel.");
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-[#2b529f]" />
            Reporting ESR
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            États réglementaires et statistiques du module Épargne Santé Retraite.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOngletPrincipal('ETATS')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              ongletPrincipal === 'ETATS'
                ? 'bg-[#2b529f] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            États
          </button>
          {peutVoirAudit && (
            <button
              onClick={() => setOngletPrincipal('AUDIT')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                ongletPrincipal === 'AUDIT'
                  ? 'bg-[#2b529f] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Journal d'audit
            </button>
          )}
        </div>
      </div>

      {ongletPrincipal === 'AUDIT' ? (
        <Audit currentUser={currentUser} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            {CATEGORIES.map((categorie) => (
              <div key={categorie}>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide px-2 mb-1">
                  {categorie}
                </p>
                <div className="space-y-1">
                  {ETATS.filter((e) => e.categorie === categorie).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEtatActif(e.id)}
                      disabled={!e.disponible}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                        etatActif === e.id
                          ? 'bg-[#2b529f]/10 text-[#2b529f] border border-[#2b529f]/30'
                          : e.disponible
                            ? 'text-slate-600 hover:bg-slate-50'
                            : 'text-slate-350 cursor-not-allowed'
                      }`}
                    >
                      {e.label}
                      {!e.disponible && <span className="block text-[10px] text-slate-400">Prochainement</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-base font-bold text-slate-800">{definition?.label}</h3>
              <div className="flex items-center gap-2">
                {etatActif === 'CIMA_C20' && (
                  <input
                    type="number"
                    value={annee}
                    onChange={(e) => setAnnee(Number(e.target.value) || annee)}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                )}
                <button
                  onClick={etatActif === 'CIMA_C20' ? chargerCima : () => chargerLignes(etatActif).then(setLignes)}
                  disabled={isLoading || !definition?.disponible}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualiser
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportEnCours || !definition?.disponible || isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {exportEnCours ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Exporter Excel
                </button>
              </div>
            </div>

            {erreur && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">{erreur}</div>
            )}

            {!definition?.disponible ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-sm">
                  Cet état sera disponible dans un prochain lot de livraison.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <Loader2 className="w-8 h-8 text-[#2b529f] animate-spin" />
                <span className="text-slate-500 text-xs font-medium">Chargement de l'état...</span>
              </div>
            ) : etatActif === 'CIMA_C20' ? (
              rapportCima && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ['Cotisations prévues', rapportCima.totaux.cotisationsPrevues],
                      ['Cotisations encaissées', rapportCima.totaux.cotisationsEncaissees],
                      ['Provisions mathématiques', rapportCima.totaux.provisionsMathematiques],
                      ['Prestations payées', rapportCima.totaux.prestationsPayees],
                    ].map(([label, valeur]) => (
                      <div key={label as string} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[11px] font-bold text-slate-400 uppercase">{label}</p>
                        <p className="text-lg font-bold text-slate-800 mt-1">{formatFCFA(valeur as number)}</p>
                      </div>
                    ))}
                  </div>
                  <ScrollableTableWrapper>
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">Période</th>
                          <th className="py-2.5 px-3">Adhérents</th>
                          <th className="py-2.5 px-3">Mouvements</th>
                          <th className="py-2.5 px-3">Cotisations prévues</th>
                          <th className="py-2.5 px-3">Cotisations encaissées</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rapportCima.trimestres.map((t) => (
                          <tr key={t.periode}>
                            <td className="py-2.5 px-3 font-medium">{t.periode}</td>
                            <td className="py-2.5 px-3">{t.nombreAdherents}</td>
                            <td className="py-2.5 px-3">{t.nombreMouvements}</td>
                            <td className="py-2.5 px-3">{formatFCFA(t.cotisationsPrevues)}</td>
                            <td className="py-2.5 px-3">{formatFCFA(t.cotisationsEncaissees)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollableTableWrapper>
                </div>
              )
            ) : lignes.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-slate-400 text-sm">Aucune donnée pour cet état.</p>
              </div>
            ) : (
              <ScrollableTableWrapper>
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-bold text-slate-500 uppercase">
                      {colonnes.map((c) => (
                        <th key={c.key} className="py-2.5 px-3 whitespace-nowrap">
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lignes.map((ligne, index) => (
                      <tr key={`${(ligne as any).matricule ?? index}-${index}`} className="hover:bg-slate-50">
                        {colonnes.map((c) => {
                          const valeur = (ligne as Record<string, unknown>)[c.key];
                          if (c.key === 'statut' && typeof valeur === 'string' && STATUT_STYLES[valeur]) {
                            return (
                              <td key={c.key} className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUT_STYLES[valeur]}`}>
                                  {valeur === 'A_JOUR' ? 'À jour' : 'Pas à jour'}
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={c.key} className="py-2.5 px-3 whitespace-nowrap">
                              {formaterCellule(valeur, c.format)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollableTableWrapper>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
