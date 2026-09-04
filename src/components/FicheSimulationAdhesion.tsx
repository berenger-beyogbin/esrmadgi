import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { formatDateFr } from '../utils/formatters';

export interface FicheSimulationData {
  matricule: string;
  civilite: string;
  nom: string;
  prenoms: string;
  date_naissance: string;
  lieu_naissance: string;
  situation_matrimoniale: string;
  telephone: string;
  email: string;
  adresse_geographique: string;
  adresse_postale: string;
  direction: string;
  emploi: string;
  grade: string;
  age_retraite: number;
  date_retraite: string;
  date_precompte: string;
  date_effet: string;
  nb_trimestre: number;
  cotisation_annuelle: number;
  cotisation_es: number;
  cotisation_es_avant_abattement?: number | null;
  taux_abattement_promo?: number | null;
}

interface FicheSimulationAdhesionProps {
  open: boolean;
  onClose: () => void;
  data: FicheSimulationData;
}

const BLANK = '……………………………………………..';

function formatMontant(n: number): string {
  if (!n || isNaN(n) || !isFinite(n)) return BLANK;
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

function formatDateOrBlank(iso: string): string {
  return iso ? formatDateFr(iso) : BLANK;
}

function sexeFromCivilite(civilite: string): { masculin: boolean; feminin: boolean } {
  const c = (civilite || '').toLowerCase();
  if (c.includes('mme') || c.includes('madame') || c.includes('mlle') || c.includes('mademoiselle')) {
    return { masculin: false, feminin: true };
  }
  if (c.includes('m.') || c.includes('monsieur')) {
    return { masculin: true, feminin: false };
  }
  return { masculin: false, feminin: false };
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 mr-4">
      <span className="inline-block w-3.5 h-3.5 border border-slate-500 text-center leading-3 text-[10px]">
        {checked ? '✓' : ''}
      </span>
      {label}
    </span>
  );
}

function normalizeAccents(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function FicheContent({ data }: { data: FicheSimulationData }) {
  const sexe = sexeFromCivilite(data.civilite);
  const matrimoniale = normalizeAccents(data.situation_matrimoniale || '');

  return (
    <div className="simulation-sheet bg-white text-slate-900 text-[12px] leading-snug p-6 print:p-3 max-w-[210mm] mx-auto font-serif print:text-[12px] print:leading-normal">
      <div className="text-center mb-1 text-[10px] font-semibold tracking-wide text-rose-700 print:hidden">
        DOCUMENT DE SIMULATION — NE PAS SIGNER — SANS VALEUR CONTRACTUELLE
      </div>
      <header className="simulation-heading">
        <h1 className="text-center text-lg print:text-xl font-bold uppercase">Fiche de simulation d'adhésion</h1>
        <h2 className="text-center text-base print:text-lg font-bold uppercase">Épargne Santé Retraite MADGI</h2>
      </header>

      <section className="simulation-identity">
        <p className="font-bold underline mb-2">Adhérent (e) :</p>

        <div className="space-y-1.5">
        <p><span className="font-semibold">Matricule :</span> /{data.matricule || BLANK}/</p>
        <p><span className="font-semibold">Nom &amp; Prénoms :</span> {data.civilite} {data.nom} {data.prenoms}</p>
        <p>
          <span className="font-semibold">Né(e) le :</span> {formatDateOrBlank(data.date_naissance)}{' '}
          <span className="font-semibold ml-4">Lieu de naissance :</span> {data.lieu_naissance || BLANK}
        </p>
        <p>
          <span className="font-semibold">Sexe :</span>{' '}
          <Checkbox checked={sexe.masculin} label="Masculin" />
          <Checkbox checked={sexe.feminin} label="Féminin" />
        </p>
        <p>
          <span className="font-semibold">Situation matrimoniale :</span>{' '}
          <Checkbox checked={matrimoniale.includes('mari')} label="Marié(e)" />
          <Checkbox checked={matrimoniale.includes('divor')} label="Divorcé(e)" />
          <Checkbox checked={matrimoniale.includes('veu')} label="Veuf(ve)" />
          <Checkbox checked={matrimoniale.includes('celib')} label="Célibataire" />
        </p>
        <p><span className="font-semibold">Emploi :</span> {data.emploi || BLANK} <span className="font-semibold ml-4">Grade :</span> {data.grade || BLANK}</p>
        <p><span className="font-semibold">Fonction :</span> {BLANK}</p>
        <p><span className="font-semibold">Direction :</span> {data.direction || BLANK}</p>
        <p><span className="font-semibold">Adresse postale :</span> {data.adresse_postale || BLANK} <span className="font-semibold ml-4">Adresse géographique :</span> {data.adresse_geographique || BLANK}</p>
        <p><span className="font-semibold">Contact(s) :</span> {data.telephone || BLANK} <span className="font-semibold ml-4">E-mail :</span> {data.email || BLANK}</p>
        <p><span className="font-semibold">Durée résiduelle d'activité (trimestre) :</span> {data.nb_trimestre || BLANK}</p>
        <p><span className="font-semibold">Âge de retraite :</span> {data.age_retraite ? `${data.age_retraite} ans` : BLANK}</p>
        <p><span className="font-semibold">Date retraite :</span> {formatDateOrBlank(data.date_retraite)}</p>
        <p><span className="font-semibold">Date du premier précompte :</span> {formatDateOrBlank(data.date_precompte)}</p>
        <p><span className="font-semibold">Date du dernier précompte :</span> {formatDateOrBlank(data.date_retraite)}</p>
        <p><span className="font-semibold">Date Effet :</span> {formatDateOrBlank(data.date_effet)}</p>
        {data.taux_abattement_promo != null && (
          <p>
            <span className="font-semibold">Cotisation standard avant abattement :</span> {formatMontant(data.cotisation_es_avant_abattement ?? 0)} / trimestre{' '}
            <span className="font-semibold ml-4">Offre promotionnelle départ retraite :</span> -{data.taux_abattement_promo}%
          </p>
        )}
        <p><span className="font-semibold">Cotisation Épargne Santé Retraite :</span> <span className="text-base font-bold text-red-600">{formatMontant(data.cotisation_es)} / trimestre</span></p>
        </div>
      </section>

      <section className="simulation-notice">
        <p className="text-justify">
          Cette fiche présente une <span className="font-semibold">simulation</span> de mon intention de souscrire à l'Épargne Santé Retraite MADGI.
          Ma souscription ne sera effective qu'après la signature du bulletin d'Adhésion et du contrat.
          Les cotisations d'un montant simulé de <span className="font-semibold">{formatMontant(data.cotisation_es)}</span> / trimestre,
          seraient perçues du <span className="font-semibold">{formatDateOrBlank(data.date_precompte)}</span> au{' '}
          <span className="font-semibold">{formatDateOrBlank(data.date_retraite)}</span> sur mes émoluments.
        </p>

        <p className="mt-1.5 text-justify">
          J'ai été informé(e) que si je passe à un grade supérieur entrainant le rallongement de ma durée d'activité,
          la cotisation sera recalculée en fonction de la nouvelle durée résiduelle d'activité.
        </p>

        <p className="mt-1.5 text-justify">
          Aussi, je suis tenu(e) d'informer la MADGI, par courrier, de toutes modifications intervenues dans mes déclarations.
        </p>
      </section>

      <footer className="simulation-signature">
        <p>Fait à Abidjan, le {BLANK}</p>
        <p className="mt-4">L'ADHÉRENT (E) <span className="italic">(Simulation — signature non requise à ce stade)</span></p>
      </footer>
    </div>
  );
}

export default function FicheSimulationAdhesion({ open, onClose, data }: FicheSimulationAdhesionProps) {
  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-100 bg-black/50 flex items-start justify-center overflow-y-auto py-8 print:hidden"
        onClick={onClose}
      >
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Aperçu — Fiche de simulation d'adhésion</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-[#2b529f] text-white rounded-lg text-sm font-semibold hover:bg-[#1c3e7b] transition"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600" title="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="max-h-[75vh] overflow-y-auto bg-slate-100 p-4">
            <FicheContent data={data} />
          </div>
        </div>
      </div>

      {/* Contenu visible uniquement à l'impression (le reste de l'app est masqué via #root en @media print) */}
      <div className="hidden print:block">
        <FicheContent data={data} />
      </div>
    </>,
    document.body,
  );
}
