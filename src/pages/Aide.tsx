import { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldAlert } from 'lucide-react';
import { DBUser, UserProfile } from '../types';

interface AideProps {
  currentUser?: DBUser;
}

interface FaqItem {
  question: string;
  reponse: string;
}

interface FaqCategorie {
  id: string;
  titre: string;
  roles: UserProfile[];
  items: FaqItem[];
}

const CATEGORIES: FaqCategorie[] = [
  {
    id: 'GESTIONNAIRE',
    titre: 'Gestionnaire ESR',
    roles: ['GESTIONNAIRE', 'ADMINISTRATEUR', 'SUPERADMIN'],
    items: [
      {
        question: "Que dois-je vérifier avant de créer ou modifier un adhérent ?",
        reponse: "Contrôlez systématiquement l'identité de l'adhérent avant toute création ou modification de son dossier.",
      },
      {
        question: 'Comment vérifier la répartition des bénéficiaires ?',
        reponse: "Assurez-vous que la somme des quotes-parts des bénéficiaires atteint bien 100 % avant de valider le dossier.",
      },
      {
        question: 'Comment traiter les précomptes ?',
        reponse: 'Générez les précomptes puis importez le retour DGI correspondant.',
      },
      {
        question: 'Que faire des lignes en écart après import du retour DGI ?',
        reponse: 'Traitez séparément les lignes encaissées, les lignes en écart et les lignes non précomptées.',
      },
      {
        question: 'Comment saisir un paiement spontané ?',
        reponse: 'Saisissez le paiement spontané en respectant le circuit de contrôle prévu : une validation est requise avant encaissement.',
      },
      {
        question: "Quand dois-je recalculer le compte ESR d'un adhérent ?",
        reponse: 'Recalculez le compte ESR après chaque encaissement de cotisation.',
      },
      {
        question: 'Comment ouvrir un dossier de prestation ?',
        reponse: "Ouvrez le dossier de prestation puis joignez les justificatifs dans le dossier d'archivage.",
      },
      {
        question: 'Quand puis-je mettre un dossier "en contrôle" ?',
        reponse: 'Uniquement lorsque le dossier est complet, avec toutes les pièces justificatives jointes.',
      },
      {
        question: "Quel est le délai de traitement d'une liquidation ?",
        reponse: "Téléchargez la liquidation puis suivez l'échéance réglementaire de 15 jours ouvrés.",
      },
      {
        question: 'Comment investiguer une anomalie sur un dossier ?',
        reponse: "Consultez le journal d'audit pour retracer les opérations effectuées sur le dossier.",
      },
    ],
  },
  {
    id: 'ADMINISTRATEUR',
    titre: 'Administrateur',
    roles: ['ADMINISTRATEUR', 'SUPERADMIN'],
    items: [
      {
        question: 'Comment gérer les comptes utilisateurs ?',
        reponse: "Créez, activez ou désactivez les comptes selon les besoins, et attribuez toujours le rôle minimal nécessaire à chaque utilisateur.",
      },
      {
        question: 'Comment maintenir les référentiels ?',
        reponse: 'Maintenez à jour les référentiels, grades, paramètres et tables de mortalité.',
      },
      {
        question: 'Comment modifier un paramètre métier (taux, frais...) ?',
        reponse: "Saisissez toujours le paramètre avec sa date d'effet. Ne modifiez jamais rétroactivement un paramètre déjà utilisé sans décision formelle.",
      },
      {
        question: 'Quels paramètres métier sont administrables ?',
        reponse: 'Le taux garanti, les frais de rente et de rachat, le délai minimal de rachat, le taux décès avant retraite, le taux invalidité avant retraite, le taux de couverture retraite, le taux de remboursement des soins et le taux décès pendant rente. Toute modification doit être datée, justifiée et vérifiée par un second gestionnaire avant utilisation opérationnelle.',
      },
      {
        question: 'Que dois-je contrôler quotidiennement ?',
        reponse: "La disponibilité des services applicatifs, via l'endpoint /api/health/ready.",
      },
      {
        question: 'Comment gérer les sauvegardes ?',
        reponse: 'Exécutez les sauvegardes régulièrement et vérifiez systématiquement leur manifeste.',
      },
      {
        question: 'Comment surveiller la sécurité ?',
        reponse: 'Examinez les journaux de sécurité ainsi que les opérations sensibles effectuées dans l’application.',
      },
    ],
  },
  {
    id: 'CLOTURE',
    titre: 'Clôture mensuelle',
    roles: ['GESTIONNAIRE', 'ADMINISTRATEUR', 'SUPERADMIN'],
    items: [
      {
        question: 'Quelles étapes suivre pour la clôture mensuelle ?',
        reponse:
          "1. S'assurer qu'aucun retour DGI ou paiement n'est en attente. " +
          '2. Recalculer les comptes ESR. ' +
          '3. Contrôler les totaux de cotisations et prestations. ' +
          '4. Exporter le reporting CIMA C-20. ' +
          '5. Exécuter et vérifier une sauvegarde. ' +
          '6. Conserver le manifeste et les fichiers dans un stockage chiffré distinct.',
      },
    ],
  },
  {
    id: 'SUPERADMIN',
    titre: 'Superadministrateur',
    roles: ['SUPERADMIN'],
    items: [
      {
        question: "Dans quels cas le superadministrateur intervient-il ?",
        reponse:
          'Uniquement pour les opérations exceptionnelles : configuration initiale, gestion des administrateurs, rotation des secrets, reprise après incident et diagnostic nécessitant l’accès technique le plus élevé. Ces opérations doivent toujours être justifiées et consignées.',
      },
    ],
  },
];

const CONTROLES_COMMUNS = [
  'Ne jamais partager un OTP, mot de passe ou secret technique.',
  'Ne pas contourner les transitions de statut.',
  'Vérifier matricule, montant, date de valeur et période avant validation.',
  "En cas de doute, laisser l'opération dans son état actuel et faire contrôler le dossier.",
];

export default function Aide({ currentUser }: AideProps) {
  const categoriesVisibles = CATEGORIES.filter(
    (cat) => !currentUser || cat.roles.includes(currentUser.role),
  );

  const [ouverte, setOuverte] = useState<string | null>(
    (currentUser && categoriesVisibles.find((cat) => cat.id === currentUser.role)?.id) ||
      categoriesVisibles[0]?.id ||
      null,
  );

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-150 shadow-xs max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-6 h-6 text-[#2b529f]" />
        <h2 className="text-2xl font-bold text-[#2b529f]">Aide &amp; Centre d'assistance MADGI ESR</h2>
      </div>
      <div className="h-px bg-slate-100" />

      <div className="space-y-2">
        {categoriesVisibles.map((categorie) => (
          <div key={categorie.id} className="rounded-xl border border-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setOuverte((cur) => (cur === categorie.id ? null : categorie.id))}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition ${
                ouverte === categorie.id ? 'bg-slate-100 text-[#2b529f]' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-expanded={ouverte === categorie.id}
            >
              <span className="text-sm font-bold uppercase tracking-wide">{categorie.titre}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${ouverte === categorie.id ? 'rotate-180' : ''}`}
              />
            </button>
            {ouverte === categorie.id && (
              <div className="p-4 border-t border-slate-100 space-y-4">
                {categorie.items.map((item) => (
                  <div key={item.question} className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">{item.question}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.reponse}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          Contrôles communs à respecter
        </div>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
          {CONTROLES_COMMUNS.map((regle) => (
            <li key={regle}>{regle}</li>
          ))}
        </ul>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-medium">
        💡 Support technique direct par email : <span className="underline select-text">support.mutuelle@dgi.gouv.ci</span> ou par téléphone au 225-20-30-40-50.
      </div>
    </div>
  );
}
