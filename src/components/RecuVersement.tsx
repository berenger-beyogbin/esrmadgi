import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { formatDateFr, formatFCFA, montantEnLettresFCFA } from '../utils/formatters';

export interface RecuVersementData {
  reference: string;
  nom: string;
  prenoms: string;
  matricule: string;
  montant: number;
  date_versement: string;
  nature_recette: string;
  periode_couverture: string;
  mode: 'ESPECES' | 'CHEQUE' | 'VIREMENT' | string;
  numero_cheque?: string;
  banque_payeur?: string;
}

interface RecuVersementProps {
  open: boolean;
  onClose: () => void;
  data: RecuVersementData;
}

function CaseACocher({ checked }: { checked: boolean }) {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 border border-slate-700 text-[10px] font-bold shrink-0">
      {checked ? 'X' : ''}
    </span>
  );
}

function RecuContent({ data }: { data: RecuVersementData }) {
  return (
    <div className="bg-white text-slate-900 text-[12px] leading-snug p-6 print:p-4 max-w-[210mm] mx-auto font-sans">
      <div className="flex items-start justify-between mb-2">
        <div className="text-[10px] font-bold leading-tight">
          <div>MUTUELLE DES AGENTS</div>
          <div>DE LA DIRECTION GENERALE DES IMPOTS</div>
          <div className="mt-1">-----------</div>
          <div>DIRECTION EXECUTIVE</div>
          <div>-----------</div>
          <div>SERVICE EPARGNE SANTE RETRAITE</div>
        </div>
        <div className="text-[10px] font-bold text-right leading-tight">
          <div>REPUBLIQUE DE CÔTE D'IVOIRE</div>
          <div>Union – Discipline – Travail</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-4 mb-4">
        <h1 className="text-lg font-bold uppercase underline">Reçu de versement</h1>
        <span className="text-sm font-semibold">N°{data.reference}</span>
      </div>

      <div className="border border-slate-800">
        <div className="grid grid-cols-2 border-b border-slate-800">
          <div className="p-2 border-r border-slate-800">
            <span className="font-bold">Nom et Prénoms :</span> {data.nom} {data.prenoms}
          </div>
          <div className="p-2">
            <span className="font-bold">Matricule :</span> {data.matricule}
          </div>
        </div>

        <div className="grid grid-cols-2 border-b border-slate-800">
          <div className="p-2 border-r border-slate-800">
            <span className="font-bold">Montant en chiffres :</span> {formatFCFA(data.montant)}
          </div>
          <div className="p-2" />
        </div>

        <div className="p-2 border-b border-slate-800">
          <span className="font-bold">Montant en lettres :</span> {montantEnLettresFCFA(data.montant)}
        </div>

        <div className="p-2 border-b border-slate-800">
          <span className="font-bold">Date du versement :</span> {formatDateFr(data.date_versement)}
        </div>

        <div className="p-2 border-b border-slate-800">
          <span className="font-bold">Nature de la recette :</span> {data.nature_recette}
        </div>

        <div className="p-2 border-b border-slate-800">
          <span className="font-bold">Période de couverture :</span> {data.periode_couverture}
        </div>

        <div className="grid grid-cols-2">
          <div className="p-2 border-r border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">Espèces :</span>
              <CaseACocher checked={data.mode === 'ESPECES'} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Chèque :</span>
              <CaseACocher checked={data.mode === 'CHEQUE'} />
              <span className="font-bold ml-2">N° Chèque :</span> {data.numero_cheque || ''}
            </div>
          </div>
          <div className="p-2">
            <span className="font-bold">Banque payeur :</span> {data.banque_payeur || ''}
          </div>
        </div>

        <div className="p-2 border-t border-slate-800 text-[10px]">
          NB : Pour tout paiement par chèque, la validation sera effective après encaissement
        </div>

        <div className="p-4 border-t border-slate-800 min-h-[60px] flex items-end justify-end">
          <span className="font-bold underline">LE SERVICE ESR</span>
        </div>
      </div>
    </div>
  );
}

export default function RecuVersement({ open, onClose, data }: RecuVersementProps) {
  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-100 bg-black/50 flex items-start justify-center overflow-y-auto py-8 print:hidden"
        onClick={onClose}
      >
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Aperçu — Reçu de versement</h3>
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
            <RecuContent data={data} />
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <RecuContent data={data} />
      </div>
    </>,
    document.body,
  );
}
