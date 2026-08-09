import assert from 'node:assert/strict';
import test from 'node:test';
import { repartirCotisationsCompte } from './comptes-esr.service';

test('les precomptes et versements spontanes alimentent les primes periodiques', () => {
  assert.deepEqual(repartirCotisationsCompte([
    { montant: 150_000, source: 'PRECOMPTE' },
    { montant: 50_000, source: 'SPONTANEE' },
    { montant: 25_000, source: 'REGULARISATION_PRECOMPTE' },
  ]), { primesPeriodiques: 225_000, cotisationUnique: 0 });
});

test('seule une source explicite alimente la cotisation unique', () => {
  assert.deepEqual(repartirCotisationsCompte([
    { montant: 150_000, source: 'PRECOMPTE' },
    { montant: 2_000_000, source: 'COTISATION_UNIQUE' },
  ]), { primesPeriodiques: 150_000, cotisationUnique: 2_000_000 });
});
