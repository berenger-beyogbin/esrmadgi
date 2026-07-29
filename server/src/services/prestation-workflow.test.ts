import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ajouterJoursOuvres,
  ancienneteAnneesCompletes,
  prestationTransitionPermise,
} from './prestation-workflow';

test('le workflow prestation impose controle, validation et paiement', () => {
  assert.equal(prestationTransitionPermise('DOSSIER_OUVERT', 'EN_CONTROLE'), true);
  assert.equal(prestationTransitionPermise('EN_CONTROLE', 'VALIDE'), true);
  assert.equal(prestationTransitionPermise('VALIDE', 'PAYE'), true);
  assert.equal(prestationTransitionPermise('DOSSIER_OUVERT', 'PAYE'), false);
  assert.equal(prestationTransitionPermise('PAYE', 'ANNULE'), false);
});

test('le delai de quinze jours exclut les fins de semaine', () => {
  assert.equal(ajouterJoursOuvres('2026-07-31', 15), '2026-08-21');
});

test('anciennete calculee en annees completes', () => {
  assert.equal(ancienneteAnneesCompletes('2024-08-01', '2026-07-31'), 1);
  assert.equal(ancienneteAnneesCompletes('2024-08-01', '2026-08-01'), 2);
});
