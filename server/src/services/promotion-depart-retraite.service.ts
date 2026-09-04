export type CategorieGradePromo = 'CD' | 'B' | 'A';

/** Barème voté par le bureau du CA le 2026-09-03, abattement % sur la cotisation trimestrielle. */
const BAREME_ABATTEMENT: Record<CategorieGradePromo, Record<number, number>> = {
  CD: { 1: 70, 2: 60, 3: 50, 4: 40, 5: 30 },
  B: { 1: 50, 2: 40, 3: 30, 4: 25, 5: 20 },
  A: { 1: 30, 2: 25, 3: 20, 4: 15, 5: 10 },
};

export function resoudreCategorieGradePromo(libelleGrade?: string | null): CategorieGradePromo | null {
  const premiere = String(libelleGrade ?? '').trim().charAt(0).toUpperCase();
  if (premiere === 'C' || premiere === 'D') return 'CD';
  if (premiere === 'B') return 'B';
  if (premiere === 'A') return 'A';
  return null;
}

/** Palier = tranche de 4 trimestres (annee civile). Au-dela de 20 trimestres restants (>5 ans), hors offre. */
export function resoudrePalierPromo(nbTrimestreRestant: number): number | null {
  if (!Number.isInteger(nbTrimestreRestant) || nbTrimestreRestant <= 0) return null;
  const palier = Math.ceil(nbTrimestreRestant / 4);
  return palier >= 1 && palier <= 5 ? palier : null;
}

export function tauxAbattementPromo(categorie: CategorieGradePromo, palier: number): number | null {
  return BAREME_ABATTEMENT[categorie]?.[palier] ?? null;
}

export interface FenetrePromo {
  actif?: boolean | null;
  date_debut?: string | null;
  date_fin?: string | null;
}

export function promotionEstActive(dateReference: string, fenetre: FenetrePromo | null | undefined): boolean {
  if (!fenetre || fenetre.actif === false) return false;
  if (fenetre.date_debut && dateReference < fenetre.date_debut) return false;
  if (fenetre.date_fin && dateReference > fenetre.date_fin) return false;
  return true;
}

export interface AbattementPromoResult {
  applique: boolean;
  categorie: CategorieGradePromo | null;
  palier: number | null;
  tauxPourcent: number | null;
  cotisationApresAbattement: number;
}

/** Arrondi a la centaine superieure, comme le reste de la grille de cotisation ESR. */
function arrondiGrille(value: number): number {
  const centimesPres = Math.round(value * 100) / 100;
  return Math.ceil(centimesPres / 100 - 1e-9) * 100;
}

export function calculerAbattementPromo(input: {
  libelleGrade?: string | null;
  nbTrimestreRestant: number;
  cotisationTrimestrielleStandard: number;
  dateReference: string;
  fenetre: FenetrePromo | null | undefined;
}): AbattementPromoResult {
  const vide: AbattementPromoResult = {
    applique: false,
    categorie: null,
    palier: null,
    tauxPourcent: null,
    cotisationApresAbattement: input.cotisationTrimestrielleStandard,
  };

  if (!promotionEstActive(input.dateReference, input.fenetre)) return vide;
  if (!Number.isFinite(input.cotisationTrimestrielleStandard) || input.cotisationTrimestrielleStandard <= 0) return vide;

  const categorie = resoudreCategorieGradePromo(input.libelleGrade);
  if (!categorie) return vide;

  const palier = resoudrePalierPromo(input.nbTrimestreRestant);
  if (!palier) return vide;

  const taux = tauxAbattementPromo(categorie, palier);
  if (taux == null) return vide;

  return {
    applique: true,
    categorie,
    palier,
    tauxPourcent: taux,
    cotisationApresAbattement: arrondiGrille(input.cotisationTrimestrielleStandard * (1 - taux / 100)),
  };
}
