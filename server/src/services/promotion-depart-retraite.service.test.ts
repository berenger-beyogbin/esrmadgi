import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculerAbattementPromo,
  resoudreCategorieGradePromo,
  resoudrePalierPromo,
  tauxAbattementPromo,
} from './promotion-depart-retraite.service';

test('categorie de grade CD fusionne C et D, sinon B ou A', () => {
  assert.equal(resoudreCategorieGradePromo('D1'), 'CD');
  assert.equal(resoudreCategorieGradePromo('C2'), 'CD');
  assert.equal(resoudreCategorieGradePromo('B3'), 'B');
  assert.equal(resoudreCategorieGradePromo('A5'), 'A');
  assert.equal(resoudreCategorieGradePromo('GRADE_TEST_60'), null);
  assert.equal(resoudreCategorieGradePromo(null), null);
});

test('palier par tranche de 4 trimestres, au-dela de 20 hors offre', () => {
  assert.equal(resoudrePalierPromo(1), 1);
  assert.equal(resoudrePalierPromo(4), 1);
  assert.equal(resoudrePalierPromo(5), 2);
  assert.equal(resoudrePalierPromo(20), 5);
  assert.equal(resoudrePalierPromo(21), null);
  assert.equal(resoudrePalierPromo(0), null);
  assert.equal(resoudrePalierPromo(-1), null);
});

test('bareme conforme a la decision du bureau du CA', () => {
  assert.equal(tauxAbattementPromo('CD', 1), 70);
  assert.equal(tauxAbattementPromo('CD', 5), 30);
  assert.equal(tauxAbattementPromo('B', 1), 50);
  assert.equal(tauxAbattementPromo('B', 5), 20);
  assert.equal(tauxAbattementPromo('A', 1), 30);
  assert.equal(tauxAbattementPromo('A', 5), 10);
});

const fenetreActive = { actif: true, date_debut: '2026-09-03', date_fin: '2026-12-31' };

test('applique l\'abattement quand la promo est active et l\'agent eligible', () => {
  const result = calculerAbattementPromo({
    libelleGrade: 'C2',
    nbTrimestreRestant: 4,
    cotisationTrimestrielleStandard: 100_000,
    dateReference: '2026-10-01',
    fenetre: fenetreActive,
  });
  assert.equal(result.applique, true);
  assert.equal(result.categorie, 'CD');
  assert.equal(result.palier, 1);
  assert.equal(result.tauxPourcent, 70);
  assert.equal(result.cotisationApresAbattement, 30_000);
});

test('aucun abattement hors fenetre de la promo', () => {
  const avant = calculerAbattementPromo({
    libelleGrade: 'A3',
    nbTrimestreRestant: 4,
    cotisationTrimestrielleStandard: 100_000,
    dateReference: '2026-08-31',
    fenetre: fenetreActive,
  });
  const apres = calculerAbattementPromo({
    libelleGrade: 'A3',
    nbTrimestreRestant: 4,
    cotisationTrimestrielleStandard: 100_000,
    dateReference: '2027-01-01',
    fenetre: fenetreActive,
  });
  assert.equal(avant.applique, false);
  assert.equal(avant.cotisationApresAbattement, 100_000);
  assert.equal(apres.applique, false);
});

test('aucun abattement au-dela de 5 ans restants ou promo inactive', () => {
  const horsDelai = calculerAbattementPromo({
    libelleGrade: 'B1',
    nbTrimestreRestant: 24,
    cotisationTrimestrielleStandard: 100_000,
    dateReference: '2026-10-01',
    fenetre: fenetreActive,
  });
  const inactive = calculerAbattementPromo({
    libelleGrade: 'B1',
    nbTrimestreRestant: 4,
    cotisationTrimestrielleStandard: 100_000,
    dateReference: '2026-10-01',
    fenetre: { ...fenetreActive, actif: false },
  });
  assert.equal(horsDelai.applique, false);
  assert.equal(inactive.applique, false);
});
