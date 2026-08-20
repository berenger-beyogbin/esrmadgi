import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculerCotisationTrimestrielleApresSpontanee,
  calculerCotisationUnique,
  calculerDecesAvantRetraite,
  calculerDecesPendantRente,
  calculerInvaliditeAvantRetraite,
  calculerProvisionDepuisMouvements,
  calculerProvisionMathematique,
  dateArreteDernierTrimestreTermine,
  calculerValeurRachatDepuisProvision,
  calculerRachat,
} from './moteur-actuariel.service';

test('un versement spontane reduit la prime par recalcul du capital restant', () => {
  const base = {
    renteAnnuelle: 1_000_000, ageRetraite: 60, ageMaximum: 62,
    nombreTrimestresRestants: 20, tauxAnnuelPourcent: 3.5, fraisRentePourcent: 5,
    mortalite: [{ age: 60, lx: 1000 }, { age: 61, lx: 900 }, { age: 62, lx: 800 }],
  };
  const avant = calculerCotisationTrimestrielleApresSpontanee({ ...base, capitalAcquis: 0 });
  const apres = calculerCotisationTrimestrielleApresSpontanee({ ...base, capitalAcquis: 500_000 });
  assert.equal(avant.statut, 'OK');
  assert.ok(apres.cotisationTrimestrielle < avant.cotisationTrimestrielle);
  assert.equal(apres.cotisationTrimestrielle % 100, 0);
});

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
  assert.equal(resultat.capitalConstitutif, 1785300);
  assert.equal(resultat.capitalConstitutif % 100, 0);
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
  assert.equal(resultat.capitalConstitutif, 1785300);
  assert.equal(resultat.cotisationUnique, 1666596.65);
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

test('la date d evaluation Excel retient le dernier trimestre entierement termine', () => {
  assert.equal(dateArreteDernierTrimestreTermine('2024-03-11'), '2023-12-31');
  assert.equal(dateArreteDernierTrimestreTermine('2024-03-31'), '2024-03-31');
  assert.equal(dateArreteDernierTrimestreTermine('2024-07-15'), '2024-06-30');
  assert.equal(dateArreteDernierTrimestreTermine('2025-01-01'), '2024-12-31');
});

test('le calcul par mouvements reproduit le cas Excel a quatre trimestres', () => {
  const result = calculerProvisionDepuisMouvements({
    mouvements: [
      { montant: 50_000, dateValeur: '2023-03-31' },
      { montant: 50_000, dateValeur: '2023-06-30' },
      { montant: 50_000, dateValeur: '2023-09-30' },
      { montant: 50_000, dateValeur: '2023-12-31' },
    ],
    dateCalcul: dateArreteDernierTrimestreTermine('2024-03-11')!,
    tauxAnnuelPourcent: 3.5,
  });
  assert.equal(result.provisionBrute, 204_356.19);
  const liquidation = calculerValeurRachatDepuisProvision(result.provisionBrute, 5, 5);
  assert.equal(liquidation.fraisGestion, 10_217.81);
  assert.equal(liquidation.penalite, 9_706.92);
  assert.equal(liquidation.montantNet, 184_431.46);
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
