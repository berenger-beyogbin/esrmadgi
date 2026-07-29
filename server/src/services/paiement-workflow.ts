export type PaiementWorkflowStatut = 'SAISI' | 'CONTROLE' | 'VALIDE' | 'REJETE' | 'ENCAISSE';

export const paiementTransitions: Readonly<Record<PaiementWorkflowStatut, readonly PaiementWorkflowStatut[]>> = {
  SAISI: ['CONTROLE', 'REJETE'],
  CONTROLE: ['VALIDE', 'REJETE'],
  VALIDE: ['ENCAISSE', 'REJETE'],
  REJETE: [],
  ENCAISSE: [],
};

export function paiementWorkflowStatus(logs: unknown[]): PaiementWorkflowStatut {
  const latest = (logs as Array<{ action?: string }>).find((log) =>
    String(log.action ?? '').startsWith('PAIEMENT_'));
  const status = String(latest?.action ?? '').replace('PAIEMENT_', '') as PaiementWorkflowStatut;
  return Object.prototype.hasOwnProperty.call(paiementTransitions, status) ? status : 'SAISI';
}

export function paiementTransitionPermise(
  statutActuel: PaiementWorkflowStatut,
  nouveauStatut: PaiementWorkflowStatut,
): boolean {
  return paiementTransitions[statutActuel].includes(nouveauStatut);
}
