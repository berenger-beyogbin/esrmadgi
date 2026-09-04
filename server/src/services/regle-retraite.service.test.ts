import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculerDateRetraite,
  calculerNombreTrimestres,
  estMatriculePriveMadgi,
  resoudreAgeRetraite,
} from './regle-retraite.service';

test('identifie uniquement cinq chiffres suivis de P', () => {
  assert.equal(estMatriculePriveMadgi('08014P'), true);
  assert.equal(estMatriculePriveMadgi('08014p'), true);
  assert.equal(estMatriculePriveMadgi('8014P'), false);
  assert.equal(estMatriculePriveMadgi('08014A'), false);
});

test('impose 60 ans aux privés et conserve la règle du grade aux fonctionnaires', () => {
  assert.equal(resoudreAgeRetraite('08014P', 65), 60);
  assert.equal(resoudreAgeRetraite('355342K', 65), 65);
});

test('calcule la retraite au 31 décembre et les trimestres inclusifs', () => {
  assert.equal(calculerDateRetraite('1990-04-13', 60), '2050-12-31');
  assert.equal(calculerNombreTrimestres('2026-09-30', '2050-12-31'), 98);
});
