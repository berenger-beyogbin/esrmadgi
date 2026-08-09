export type EcheanceApsStatut =
  | 'GENEREE'
  | 'EN_CONTROLE'
  | 'VALIDEE'
  | 'PAYEE'
  | 'REJETEE'
  | 'SUSPENDUE'
  | 'ANNULEE';

export const echeanceApsTransitions: Readonly<Record<EcheanceApsStatut, readonly EcheanceApsStatut[]>> = {
  GENEREE: ['EN_CONTROLE', 'ANNULEE'],
  EN_CONTROLE: ['VALIDEE', 'REJETEE', 'SUSPENDUE', 'ANNULEE'],
  VALIDEE: ['PAYEE', 'SUSPENDUE', 'ANNULEE'],
  PAYEE: [],
  REJETEE: ['EN_CONTROLE', 'ANNULEE'],
  SUSPENDUE: ['EN_CONTROLE', 'ANNULEE'],
  ANNULEE: [],
};

export function echeanceApsTransitionPermise(actuel: EcheanceApsStatut, suivant: EcheanceApsStatut): boolean {
  return echeanceApsTransitions[actuel]?.includes(suivant) ?? false;
}

export function trimestreDepuisDate(dateIso: string): { annee: number; trimestre: number; periode: string } {
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Date de trimestre invalide');
  const annee = date.getUTCFullYear();
  const trimestre = Math.floor(date.getUTCMonth() / 3) + 1;
  return { annee, trimestre, periode: `${annee}-T${trimestre}` };
}

export function bornesTrimestre(annee: number, trimestre: number): { debut: string; fin: string } {
  if (!Number.isInteger(annee) || !Number.isInteger(trimestre) || trimestre < 1 || trimestre > 4) {
    throw new Error('Annee ou trimestre invalide');
  }
  const moisDebut = (trimestre - 1) * 3;
  const debut = new Date(Date.UTC(annee, moisDebut, 1));
  const fin = new Date(Date.UTC(annee, moisDebut + 3, 0));
  return { debut: debut.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) };
}

export function calculerEcheanceTrimestrielle(
  cotisationAnnuelle: number,
  tauxCouverturePourcent: number,
): number {
  if (cotisationAnnuelle < 0 || tauxCouverturePourcent < 0) throw new Error('Montant ou taux invalide');
  return Math.round((cotisationAnnuelle * tauxCouverturePourcent / 100 / 4 + Number.EPSILON) * 100) / 100;
}
