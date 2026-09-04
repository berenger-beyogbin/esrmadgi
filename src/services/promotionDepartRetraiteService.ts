/**
 * Miroir client de server/src/services/promotion-depart-retraite.service.ts.
 * Barème voté par le bureau du CA le 2026-09-03 — à garder synchronisé avec la version serveur,
 * qui reste la source d'autorité (le montant enregistré est toujours recalculé côté serveur).
 */

export type CategorieGradePromo = 'CD' | 'B' | 'A';

const BAREME_ABATTEMENT: Record<CategorieGradePromo, Record<number, number>> = {
  CD: { 1: 70, 2: 60, 3: 50, 4: 40, 5: 30 },
  B: { 1: 50, 2: 40, 3: 30, 4: 25, 5: 20 },
  A: { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 },
};

export interface FenetrePromo {
  actif?: boolean | null;
  dateDebut?: string | null;
  dateFin?: string | null;
}

export interface AbattementPromoResult {
  applique: boolean;
  categorie: CategorieGradePromo | null;
  palier: number | null;
  tauxPourcent: number | null;
  cotisationApresAbattement: number;
}

function resoudreCategorieGradePromo(libelleGrade?: string | null): CategorieGradePromo | null {
  const premiere = String(libelleGrade ?? '').trim().charAt(0).toUpperCase();
  if (premiere === 'C' || premiere === 'D') return 'CD';
  if (premiere === 'B') return 'B';
  if (premiere === 'A') return 'A';
  return null;
}

function resoudrePalierPromo(nbTrimestreRestant: number): number | null {
  if (!Number.isInteger(nbTrimestreRestant) || nbTrimestreRestant <= 0) return null;
  const palier = Math.ceil(nbTrimestreRestant / 4);
  return palier >= 1 && palier <= 5 ? palier : null;
}

function promotionEstActive(dateReference: string, fenetre: FenetrePromo | null | undefined): boolean {
  if (!fenetre || fenetre.actif === false) return false;
  if (fenetre.dateDebut && dateReference < fenetre.dateDebut) return false;
  if (fenetre.dateFin && dateReference > fenetre.dateFin) return false;
  return true;
}

function arrondiGrille(value: number): number {
  const centimesPres = Math.round(value * 100) / 100;
  return Math.ceil(centimesPres / 100 - 1e-9) * 100;
}

export const promotionDepartRetraiteService = {
  calculerAbattementPromo(input: {
    libelleGrade?: string | null;
    nbTrimestreRestant: number;
    cotisationTrimestrielleStandard: number;
    fenetre: FenetrePromo | null | undefined;
    dateReference?: string;
  }): AbattementPromoResult {
    const vide: AbattementPromoResult = {
      applique: false,
      categorie: null,
      palier: null,
      tauxPourcent: null,
      cotisationApresAbattement: input.cotisationTrimestrielleStandard,
    };

    const dateReference = input.dateReference ?? new Date().toISOString().slice(0, 10);
    if (!promotionEstActive(dateReference, input.fenetre)) return vide;
    if (!Number.isFinite(input.cotisationTrimestrielleStandard) || input.cotisationTrimestrielleStandard <= 0) return vide;

    const categorie = resoudreCategorieGradePromo(input.libelleGrade);
    if (!categorie) return vide;

    const palier = resoudrePalierPromo(input.nbTrimestreRestant);
    if (!palier) return vide;

    const taux = BAREME_ABATTEMENT[categorie]?.[palier];
    if (taux == null) return vide;

    return {
      applique: true,
      categorie,
      palier,
      tauxPourcent: taux,
      cotisationApresAbattement: arrondiGrille(input.cotisationTrimestrielleStandard * (1 - taux / 100)),
    };
  },
};
