export type PaiementWorkflowStatut =
  | 'SAISI' | 'CONTROLE' | 'DEPOSE_BANQUE' | 'COMPENSE'
  | 'VALIDE' | 'REJETE' | 'REJETE_BANQUE' | 'ENCAISSE';

export const paiementTransitions: Readonly<Record<PaiementWorkflowStatut, readonly PaiementWorkflowStatut[]>> = {
  SAISI: ['CONTROLE', 'REJETE'],
  CONTROLE: ['VALIDE', 'DEPOSE_BANQUE', 'REJETE'],
  DEPOSE_BANQUE: ['COMPENSE', 'REJETE_BANQUE'],
  COMPENSE: ['VALIDE', 'REJETE_BANQUE'],
  VALIDE: ['ENCAISSE', 'REJETE'],
  REJETE: [],
  REJETE_BANQUE: [],
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
