import assert from 'node:assert/strict';
import test from 'node:test';
import { dateArreteTrimestre, dateValeurCompatibleCloture, dateValeurSuivante, estPaiementSpontane } from './periodes-precompte.service';
import { calculerProvisionDepuisMouvements } from './moteur-actuariel.service';

test('la date de valeur est le premier jour du trimestre suivant', () => {
  assert.equal(dateValeurSuivante(2026, 2), '2026-07-01');
});

test('la date d arrete actuarielle est le dernier jour du trimestre', () => {
  assert.equal(dateArreteTrimestre(2026, 1), '2026-03-31');
  assert.equal(dateArreteTrimestre(2026, 2), '2026-06-30');
  assert.equal(dateArreteTrimestre(2026, 4), '2026-12-31');
});

test('la cloture d un trimestre ne credite qu une periode d interet', () => {
  const resultat = calculerProvisionDepuisMouvements({
    mouvements: [{ montant: 70_000, dateValeur: '2026-03-31' }],
    dateCalcul: dateArreteTrimestre(2026, 1),
    tauxAnnuelPourcent: 3.5,
  });
  const tauxTrimestriel = Math.pow(1.035, 1 / 4) - 1;
  assert.ok(Math.abs(resultat.provisionBrute - 70_000 * (1 + tauxTrimestriel)) <= 0.01);
});

test('une date de valeur posterieure a la date d arrete bloque la cloture', () => {
  assert.equal(dateValeurCompatibleCloture('2026-06-30', '2026-06-30'), true);
  assert.equal(dateValeurCompatibleCloture('2026-06-16', '2026-06-30'), true);
  assert.equal(dateValeurCompatibleCloture('2026-07-01', '2026-06-30'), false);
});

test('la clôture du quatrième trimestre passe à l’année suivante', () => {
  assert.equal(dateValeurSuivante(2026, 4), '2027-01-01');
});

test('les cotisations spontanées encaissées sont reconnues avec les deux libellés historiques', () => {
  assert.equal(estPaiementSpontane({ source: 'SPONTANEE', statut_detail: 'ENCAISSEE' }), true);
  assert.equal(estPaiementSpontane({ source: 'DIRECT', statut_detail: 'ENCAISSEE' }), true);
  assert.equal(estPaiementSpontane({ source: 'SPONTANEE', statut_detail: 'PREVUE' }), false);
  assert.equal(estPaiementSpontane({ source: 'PRECOMPTE', statut_detail: 'ENCAISSEE' }), false);
  assert.equal(estPaiementSpontane({ source: 'REGULARISATION_PRECOMPTE', statut_detail: 'ENCAISSEE' }), false);
});
