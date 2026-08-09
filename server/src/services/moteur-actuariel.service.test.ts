import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculerCotisationUnique,
  calculerDecesAvantRetraite,
  calculerDecesPendantRente,
  calculerInvaliditeAvantRetraite,
  calculerProvisionDepuisMouvements,
  calculerProvisionMathematique,
  calculerValeurRachatEligibleDepuisProvision,
  calculerRachat,
} from './moteur-actuariel.service';

const mortaliteMini = [
  { age: 60, lx: 100000 },
  { age: 61, lx: 98000 },
  { age: 62, lx: 95000 },
];

test('cotisation unique egale au capital constitutif au depart en retraite', () => {
  const resultat = calculerCotisationUnique({
    renteAnnuelle: 600000,
    tauxCouverturePourcent: 100,
    ageRetraite: 60,
    ageMaximum: 63,
    tauxAnnuelPourcent: 3.5,
    fraisRentePourcent: 5,
    nombreTrimestresAvantRetraite: 0,
    mortalite: mortaliteMini,
  });
  assert.equal(resultat.statut, 'OK');
  assert.equal(resultat.cotisationUnique, resultat.capitalConstitutif);
  assert.equal(resultat.capitalConstitutif, 1785227.89);
});

test('cotisation unique est actualisee avant la retraite', () => {
  const resultat = calculerCotisationUnique({
    renteAnnuelle: 600000,
    tauxCouverturePourcent: 100,
    ageRetraite: 60,
    ageMaximum: 63,
    tauxAnnuelPourcent: 3.5,
    fraisRentePourcent: 5,
    nombreTrimestresAvantRetraite: 8,
    mortalite: mortaliteMini,
  });
  assert.equal(resultat.statut, 'OK');
  assert.ok(resultat.cotisationUnique < resultat.capitalConstitutif);
  assert.equal(resultat.cotisationUnique, 1666529.34);
});

test('provision mathematique reproduit le classeur deces', () => {
  const result = calculerProvisionMathematique({
    cotisationTrimestrielle: 70_000,
    nombreTrimestresCourus: 9,
    tauxAnnuelPourcent: 3.5,
  });
  assert.equal(result.statut, 'OK');
  assert.ok(Math.abs(result.provisionBrute - 657_844.21) <= 0.01);
});

test('provision par mouvements equivaut a la formule recurrente', () => {
  const mouvements = Array.from({ length: 9 }, (_, index) => ({
    montant: 70_000,
    dateValeur: `${2022 + Math.floor(index / 4)}-${String((index % 4) * 3 + 3).padStart(2, '0')}-31`,
  }));
  const result = calculerProvisionDepuisMouvements({
    mouvements,
    dateCalcul: '2024-03-31',
    tauxAnnuelPourcent: 3.5,
  });
  assert.equal(result.statut, 'OK');
  assert.equal(result.capitalVerse, 630_000);
  assert.ok(Math.abs(result.provisionBrute - 657_844.21) <= 0.01);
});

test('rachat reproduit le classeur de reference', () => {
  const result = calculerRachat({
    cotisationTrimestrielle: 50_000,
    nombreTrimestresCourus: 4,
    tauxAnnuelPourcent: 3.5,
    fraisGestionPourcent: 5,
    penalitePourcent: 5,
    ancienneteAnnees: 2,
    ancienneteMinimaleAnnees: 2,
  });
  assert.equal(result.statut, 'OK');
  assert.equal(result.eligible, true);
  // Le moteur generique sait appliquer une penalite explicite. Dans le flux
  // metier, le compte et le rachat passent 0 apres le delai d'eligibilite.
  assert.ok(Math.abs(result.montantNet - 184_431.46) <= 0.01);
});

test('rachat refuse avant le delai parametre', () => {
  const result = calculerRachat({
    cotisationTrimestrielle: 50_000,
    nombreTrimestresCourus: 4,
    tauxAnnuelPourcent: 3.5,
    fraisGestionPourcent: 5,
    penalitePourcent: 5,
    ancienneteAnnees: 1.5,
    ancienneteMinimaleAnnees: 2,
  });
  assert.equal(result.statut, 'NON_ELIGIBLE');
  assert.equal(result.montantNet, 0);
});

test('une valeur de rachat eligible ne subit plus la penalite avant delai', () => {
  const result = calculerValeurRachatEligibleDepuisProvision(204_356.18711402288, 5);
  assert.equal(result.penalite, 0);
  assert.equal(result.montantNet, 194_138.38);
});

test('deces et invalidite utilisent leur taux parametre', () => {
  const input = {
    cotisationTrimestrielle: 70_000,
    nombreTrimestresCourus: 9,
    tauxAnnuelPourcent: 3.5,
    tauxVersementPourcent: 95,
  };
  const deces = calculerDecesAvantRetraite(input);
  const invalidite = calculerInvaliditeAvantRetraite(input);
  assert.ok(Math.abs(deces.montantVerse - 624_952) <= 0.01);
  assert.equal(invalidite.montantVerse, deces.montantVerse);
});

test('deces pendant rente reproduit le document explicatif', () => {
  const result = calculerDecesPendantRente({
    capitalRestantDu: 8_862_600,
    tauxVersementPourcent: 80,
  });
  assert.equal(result.statut, 'OK');
  assert.equal(result.montantVerse, 7_090_080);
});
