import assert from 'node:assert/strict';
import test from 'node:test';
import { calculerCotisationNette, estEligibleAuPrecomptePourPeriode } from './cotisations.service';

test('inclut l adherent dans le trimestre de son premier precompte', () => {
  assert.equal(estEligibleAuPrecomptePourPeriode(
    { cotisation_es: 100_000, date_precompte: '2026-09-30' },
    '2026-09-30',
  ), true);
});

test('exclut l adherent des trimestres anterieurs au premier precompte', () => {
  assert.equal(estEligibleAuPrecomptePourPeriode(
    { cotisation_es: 100_000, date_precompte: '2026-09-30' },
    '2026-06-30',
  ), false);
});

test('inclut l adherent dans les trimestres posterieurs au premier precompte', () => {
  assert.equal(estEligibleAuPrecomptePourPeriode(
    { cotisation_es: 100_000, date_precompte: '2026-09-30' },
    '2026-12-31',
  ), true);
});

test('exclut une fiche sans premier precompte ou sans cotisation', () => {
  assert.equal(estEligibleAuPrecomptePourPeriode({ cotisation_es: 100_000, date_precompte: null }, '2026-12-31'), false);
  assert.equal(estEligibleAuPrecomptePourPeriode({ cotisation_es: 0, date_precompte: '2026-09-30' }, '2026-12-31'), false);
});

test('un paiement spontane diminue la cotisation trimestrielle', () => {
  assert.equal(calculerCotisationNette(100_000, 30_000), 70_000);
});

test('la cotisation nette ne devient jamais negative', () => {
  assert.equal(calculerCotisationNette(100_000, 125_000), 0);
});

test('refuse un credit spontane negatif', () => {
  assert.throws(() => calculerCotisationNette(100_000, -1));
});
