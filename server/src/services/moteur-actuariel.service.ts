export type StatutCalcul = 'OK' | 'NON_ELIGIBLE' | 'PARAMETRES_INVALIDES';

export interface ProvisionMathematiqueInput {
  cotisationTrimestrielle: number;
  nombreTrimestresCourus: number;
  tauxAnnuelPourcent: number;
}

export interface ProvisionMathematiqueResult {
  statut: StatutCalcul;
  provisionBrute: number;
  tauxTrimestriel: number;
  formule: string;
}

export interface MouvementCotisation {
  montant: number;
  dateValeur: string;
}

export interface ProvisionMouvementsInput {
  mouvements: MouvementCotisation[];
  dateCalcul: string;
  tauxAnnuelPourcent: number;
}

export interface LiquidationAvantRetraiteInput extends ProvisionMathematiqueInput {
  tauxVersementPourcent: number;
}

export interface RachatInput extends ProvisionMathematiqueInput {
  fraisGestionPourcent: number;
  penalitePourcent: number;
  ancienneteAnnees: number;
  ancienneteMinimaleAnnees: number;
}

export interface RachatResult extends ProvisionMathematiqueResult {
  eligible: boolean;
  fraisGestion: number;
  penalite: number;
  montantNet: number;
}

export interface LiquidationResult extends ProvisionMathematiqueResult {
  tauxVersementPourcent: number;
  montantVerse: number;
}

export interface DecesPendantRenteInput {
  capitalRestantDu: number;
  tauxVersementPourcent: number;
}

export interface DecesPendantRenteResult {
  statut: StatutCalcul;
  capitalRestantDu: number;
  tauxVersementPourcent: number;
  montantVerse: number;
  formule: string;
}

export interface PointMortalite {
  age: number;
  lx: number;
}

export interface CotisationUniqueInput {
  renteAnnuelle: number;
  tauxCouverturePourcent: number;
  ageRetraite: number;
  ageMaximum: number;
  tauxAnnuelPourcent: number;
  fraisRentePourcent: number;
  nombreTrimestresAvantRetraite: number;
  mortalite: PointMortalite[];
}

export interface CotisationRetraiteResult {
  statut: StatutCalcul;
  facteurRente: number;
  capitalConstitutif: number;
  cotisationUnique: number;
  formule: string;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function isPercentage(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculerCotisationUnique(input: CotisationUniqueInput): CotisationRetraiteResult {
  const formule = 'PU = R * couverture * (1 + g) * a_y * v_trimestriel^n';
  const invalide = (): CotisationRetraiteResult => ({
    statut: 'PARAMETRES_INVALIDES',
    facteurRente: 0,
    capitalConstitutif: 0,
    cotisationUnique: 0,
    formule,
  });
  if (
    !isNonNegativeFinite(input.renteAnnuelle)
    || !isPercentage(input.tauxCouverturePourcent)
    || !Number.isInteger(input.ageRetraite)
    || !Number.isInteger(input.ageMaximum)
    || input.ageRetraite < 0
    || input.ageMaximum <= input.ageRetraite
    || !isNonNegativeFinite(input.tauxAnnuelPourcent)
    || !isPercentage(input.fraisRentePourcent)
    || !Number.isInteger(input.nombreTrimestresAvantRetraite)
    || input.nombreTrimestresAvantRetraite < 0
    || !Array.isArray(input.mortalite)
  ) return invalide();

  const lxByAge = new Map(input.mortalite.map((point) => [point.age, point.lx]));
  const lxRetraite = lxByAge.get(input.ageRetraite);
  if (!lxRetraite || lxRetraite <= 0) return invalide();

  const tauxAnnuel = input.tauxAnnuelPourcent / 100;
  const vAnnuel = 1 / (1 + tauxAnnuel);
  let somme = 0;
  for (let age = input.ageRetraite; age < input.ageMaximum; age += 1) {
    const lx = lxByAge.get(age);
    if (lx == null || lx < 0) return invalide();
    somme += lx * Math.pow(vAnnuel, age - input.ageRetraite);
  }

  const facteurRente = somme / lxRetraite;
  const capitalConstitutif = input.renteAnnuelle
    * input.tauxCouverturePourcent / 100
    * (1 + input.fraisRentePourcent / 100)
    * facteurRente;
  const tauxTrimestriel = Math.pow(1 + tauxAnnuel, 1 / 4) - 1;
  const valeurActuelle = capitalConstitutif
    / Math.pow(1 + tauxTrimestriel, input.nombreTrimestresAvantRetraite);

  return {
    statut: 'OK',
    facteurRente,
    capitalConstitutif: roundMoney(capitalConstitutif),
    cotisationUnique: roundMoney(valeurActuelle),
    formule,
  };
}

function quarterIndex(dateIso: string): number | null {
  const match = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return year * 4 + Math.floor((month - 1) / 3);
}

export function calculerProvisionMathematique(
  input: ProvisionMathematiqueInput,
): ProvisionMathematiqueResult {
  if (
    !isNonNegativeFinite(input.cotisationTrimestrielle)
    || !Number.isInteger(input.nombreTrimestresCourus)
    || input.nombreTrimestresCourus < 0
    || !isNonNegativeFinite(input.tauxAnnuelPourcent)
  ) {
    return {
      statut: 'PARAMETRES_INVALIDES',
      provisionBrute: 0,
      tauxTrimestriel: 0,
      formule: 'PM = P * (1 + ip) * (((1 + ip)^t - 1) / ip)',
    };
  }

  const tauxAnnuel = input.tauxAnnuelPourcent / 100;
  const tauxTrimestriel = Math.pow(1 + tauxAnnuel, 1 / 4) - 1;

  if (input.nombreTrimestresCourus === 0 || input.cotisationTrimestrielle === 0) {
    return {
      statut: 'OK',
      provisionBrute: 0,
      tauxTrimestriel,
      formule: 'PM = P * (1 + ip) * (((1 + ip)^t - 1) / ip)',
    };
  }

  const facteur = tauxTrimestriel === 0
    ? input.nombreTrimestresCourus
    : ((Math.pow(1 + tauxTrimestriel, input.nombreTrimestresCourus) - 1) / tauxTrimestriel);
  const provisionBrute = input.cotisationTrimestrielle * (1 + tauxTrimestriel) * facteur;

  return {
    statut: 'OK',
    provisionBrute: roundMoney(provisionBrute),
    tauxTrimestriel,
    formule: 'PM = P * (1 + ip) * (((1 + ip)^t - 1) / ip)',
  };
}

export function calculerProvisionDepuisMouvements(
  input: ProvisionMouvementsInput,
): ProvisionMathematiqueResult & { capitalVerse: number; nombreMouvements: number } {
  const calculQuarter = quarterIndex(input.dateCalcul);
  if (
    calculQuarter == null
    || !isNonNegativeFinite(input.tauxAnnuelPourcent)
    || !Array.isArray(input.mouvements)
  ) {
    return {
      statut: 'PARAMETRES_INVALIDES',
      provisionBrute: 0,
      tauxTrimestriel: 0,
      capitalVerse: 0,
      nombreMouvements: 0,
      formule: 'PM = somme(montant * (1 + ip)^(trimestres courus + 1))',
    };
  }

  const tauxAnnuel = input.tauxAnnuelPourcent / 100;
  const tauxTrimestriel = Math.pow(1 + tauxAnnuel, 1 / 4) - 1;
  let capitalVerse = 0;
  let provisionBrute = 0;

  for (const mouvement of input.mouvements) {
    const movementQuarter = quarterIndex(mouvement.dateValeur);
    if (
      movementQuarter == null
      || movementQuarter > calculQuarter
      || !isNonNegativeFinite(mouvement.montant)
    ) {
      return {
        statut: 'PARAMETRES_INVALIDES',
        provisionBrute: 0,
        tauxTrimestriel,
        capitalVerse: 0,
        nombreMouvements: 0,
        formule: 'PM = somme(montant * (1 + ip)^(trimestres courus + 1))',
      };
    }
    const elapsedQuarters = calculQuarter - movementQuarter;
    capitalVerse += mouvement.montant;
    provisionBrute += mouvement.montant * Math.pow(1 + tauxTrimestriel, elapsedQuarters + 1);
  }

  return {
    statut: 'OK',
    provisionBrute: roundMoney(provisionBrute),
    tauxTrimestriel,
    capitalVerse: roundMoney(capitalVerse),
    nombreMouvements: input.mouvements.length,
    formule: 'PM = somme(montant * (1 + ip)^(trimestres courus + 1))',
  };
}

export function calculerRachat(input: RachatInput): RachatResult {
  const provision = calculerProvisionMathematique(input);
  const eligible = Number.isFinite(input.ancienneteAnnees)
    && Number.isFinite(input.ancienneteMinimaleAnnees)
    && input.ancienneteAnnees >= input.ancienneteMinimaleAnnees;

  if (
    provision.statut !== 'OK'
    || !isPercentage(input.fraisGestionPourcent)
    || !isPercentage(input.penalitePourcent)
    || input.ancienneteAnnees < 0
    || input.ancienneteMinimaleAnnees < 0
  ) {
    return {
      ...provision,
      statut: 'PARAMETRES_INVALIDES',
      eligible: false,
      fraisGestion: 0,
      penalite: 0,
      montantNet: 0,
    };
  }

  if (!eligible) {
    return {
      ...provision,
      statut: 'NON_ELIGIBLE',
      eligible: false,
      fraisGestion: 0,
      penalite: 0,
      montantNet: 0,
    };
  }

  const fraisGestion = provision.provisionBrute * input.fraisGestionPourcent / 100;
  const baseApresFrais = provision.provisionBrute - fraisGestion;
  const penalite = baseApresFrais * input.penalitePourcent / 100;

  return {
    ...provision,
    eligible: true,
    fraisGestion: roundMoney(fraisGestion),
    penalite: roundMoney(penalite),
    montantNet: roundMoney(Math.max(baseApresFrais - penalite, 0)),
  };
}

function calculerLiquidationAvantRetraite(
  input: LiquidationAvantRetraiteInput,
): LiquidationResult {
  const provision = calculerProvisionMathematique(input);
  if (provision.statut !== 'OK' || !isPercentage(input.tauxVersementPourcent)) {
    return {
      ...provision,
      statut: 'PARAMETRES_INVALIDES',
      tauxVersementPourcent: 0,
      montantVerse: 0,
    };
  }

  return {
    ...provision,
    tauxVersementPourcent: input.tauxVersementPourcent,
    montantVerse: roundMoney(provision.provisionBrute * input.tauxVersementPourcent / 100),
  };
}

export function calculerDecesAvantRetraite(
  input: LiquidationAvantRetraiteInput,
): LiquidationResult {
  return calculerLiquidationAvantRetraite(input);
}

export function calculerInvaliditeAvantRetraite(
  input: LiquidationAvantRetraiteInput,
): LiquidationResult {
  return calculerLiquidationAvantRetraite(input);
}

export function calculerDecesPendantRente(
  input: DecesPendantRenteInput,
): DecesPendantRenteResult {
  if (!isNonNegativeFinite(input.capitalRestantDu) || !isPercentage(input.tauxVersementPourcent)) {
    return {
      statut: 'PARAMETRES_INVALIDES',
      capitalRestantDu: 0,
      tauxVersementPourcent: 0,
      montantVerse: 0,
      formule: 'Montant = capital restant du * taux de versement',
    };
  }

  return {
    statut: 'OK',
    capitalRestantDu: input.capitalRestantDu,
    tauxVersementPourcent: input.tauxVersementPourcent,
    montantVerse: roundMoney(input.capitalRestantDu * input.tauxVersementPourcent / 100),
    formule: 'Montant = capital restant du * taux de versement',
  };
}
