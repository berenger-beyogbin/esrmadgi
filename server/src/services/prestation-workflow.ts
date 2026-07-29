export type PrestationWorkflowStatut =
  | 'DOSSIER_OUVERT'
  | 'EN_CONTROLE'
  | 'VALIDE'
  | 'PAYE'
  | 'ANNULE';

export const prestationTransitions: Readonly<Record<PrestationWorkflowStatut, readonly PrestationWorkflowStatut[]>> = {
  DOSSIER_OUVERT: ['EN_CONTROLE', 'ANNULE'],
  EN_CONTROLE: ['VALIDE', 'ANNULE'],
  VALIDE: ['PAYE', 'ANNULE'],
  PAYE: [],
  ANNULE: [],
};

export function prestationTransitionPermise(
  statutActuel: PrestationWorkflowStatut,
  nouveauStatut: PrestationWorkflowStatut,
): boolean {
  return prestationTransitions[statutActuel].includes(nouveauStatut);
}

export function ajouterJoursOuvres(dateIso: string, nombreJours: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || !Number.isInteger(nombreJours) || nombreJours < 0) {
    throw new Error('Date ou nombre de jours invalide');
  }
  let restant = nombreJours;
  while (restant > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const jour = date.getUTCDay();
    if (jour !== 0 && jour !== 6) restant -= 1;
  }
  return date.toISOString().slice(0, 10);
}

export function ancienneteAnneesCompletes(dateDebutIso: string, dateFinIso: string): number {
  const debut = new Date(`${dateDebutIso}T00:00:00Z`);
  const fin = new Date(`${dateFinIso}T00:00:00Z`);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || fin < debut) return -1;
  let annees = fin.getUTCFullYear() - debut.getUTCFullYear();
  if (
    fin.getUTCMonth() < debut.getUTCMonth()
    || (fin.getUTCMonth() === debut.getUTCMonth() && fin.getUTCDate() < debut.getUTCDate())
  ) annees -= 1;
  return annees;
}
