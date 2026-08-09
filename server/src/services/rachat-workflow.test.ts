import assert from 'node:assert/strict';
import test from 'node:test';
import { ancienneteAnneesCompletes, rachatTransitionPermise } from './rachat-workflow';

test('le workflow rachat impose controle validation paiement',()=>{
  assert.equal(rachatTransitionPermise('DOSSIER_OUVERT','EN_CONTROLE'),true);
  assert.equal(rachatTransitionPermise('DOSSIER_OUVERT','VALIDE'),false);
  assert.equal(rachatTransitionPermise('EN_CONTROLE','VALIDE'),true);
  assert.equal(rachatTransitionPermise('VALIDE','PAYE'),true);
  assert.equal(rachatTransitionPermise('PAYE','ANNULE'),false);
});
test('anciennete compte les annees completes',()=>{
  assert.equal(ancienneteAnneesCompletes('2024-03-31','2026-03-30'),1);
  assert.equal(ancienneteAnneesCompletes('2024-03-31','2026-03-31'),2);
});

