import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bornesTrimestre,
  calculerEcheanceTrimestrielle,
  echeanceApsTransitionPermise,
  trimestreDepuisDate,
} from './rente-sante-workflow';

test('calcule le montant trimestriel couvert', () => {
  assert.equal(calculerEcheanceTrimestrielle(150_000, 100), 37_500);
  assert.equal(calculerEcheanceTrimestrielle(150_000, 80), 30_000);
});

test('determine le trimestre et ses bornes', () => {
  assert.deepEqual(trimestreDepuisDate('2026-08-08'), { annee: 2026, trimestre: 3, periode: '2026-T3' });
  assert.deepEqual(bornesTrimestre(2026, 1), { debut: '2026-01-01', fin: '2026-03-31' });
});

test('interdit de modifier une echeance payee', () => {
  assert.equal(echeanceApsTransitionPermise('VALIDEE', 'PAYEE'), true);
  assert.equal(echeanceApsTransitionPermise('PAYEE', 'ANNULEE'), false);
});
