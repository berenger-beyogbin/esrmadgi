import assert from 'node:assert/strict';
import test from 'node:test';
import {
  paiementTransitionPermise,
  paiementWorkflowStatus,
  PaiementWorkflowStatut,
} from './paiement-workflow';

test('un paiement sans journal est saisi', () => {
  assert.equal(paiementWorkflowStatus([]), 'SAISI');
});

test('le dernier evenement de workflow determine le statut', () => {
  assert.equal(paiementWorkflowStatus([
    { action: 'PAIEMENT_VALIDE' },
    { action: 'PAIEMENT_CONTROLE' },
    { action: 'PAIEMENT_SAISI' },
  ]), 'VALIDE');
});

test('le circuit nominal impose controle, validation puis encaissement', () => {
  const chemin: PaiementWorkflowStatut[] = ['SAISI', 'CONTROLE', 'VALIDE', 'ENCAISSE'];
  for (let index = 0; index < chemin.length - 1; index += 1) {
    assert.equal(paiementTransitionPermise(chemin[index], chemin[index + 1]), true);
  }
});

test('les sauts et la modification apres encaissement sont interdits', () => {
  assert.equal(paiementTransitionPermise('SAISI', 'ENCAISSE'), false);
  assert.equal(paiementTransitionPermise('CONTROLE', 'ENCAISSE'), false);
  assert.equal(paiementTransitionPermise('ENCAISSE', 'REJETE'), false);
});

test('un rejet est terminal', () => {
  assert.equal(paiementTransitionPermise('SAISI', 'REJETE'), true);
  assert.equal(paiementTransitionPermise('CONTROLE', 'REJETE'), true);
  assert.equal(paiementTransitionPermise('VALIDE', 'REJETE'), true);
  assert.equal(paiementTransitionPermise('REJETE', 'SAISI'), false);
});
