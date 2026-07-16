import { toIsoDate } from '../utils/formatters';

/**
 * Service de calculs métiers pour l'Épargne Santé Retraite (ESR).
 * Logique alignée sur WebDev MADGI ESR (C1-B, C1-C).
 */

// ─── Interfaces C1-C ────────────────────────────────────────────────────────

export interface MortalitePoint {
  age_mort: number;
  lx: number;
}

export interface CalculCotisationTrimestrielleParams {
  /** pR_annuel WebDev — montant annuel de référence */
  cotisationAnnuelle: number;
  /** pPctPriseEnCharge WebDev — ex. 1 (100 %) */
  pctPriseEnCharge: number;
  /** pAgeRetraite WebDev */
  ageRetraite: number;
  /** pN_trimestres WebDev — nombre de trimestres de cotisation */
  nbTrimestres: number;
  /** pTauxAnnuel WebDev — ex. 0.035 */
  tauxAnnuel: number;
  /** pFraisRente WebDev — ex. 0.05 */
  fraisRente: number;
  /** pAgeMax WebDev — ex. 106 */
  ageMax: number;
  /** Table de mortalité : chaque ligne contient age_mort et lx */
  mortalite: MortalitePoint[];
  /** Pas d'arrondi de la prime (défaut : 100) */
  pasArrondi?: number;
}

export interface CalculCotisationTrimestrielleResult {
  /** Prime trimestrielle Pp arrondie au pas supérieur */
  cotisationTrimestrielle: number;
  /** Capital constitutif K avant échelonnement */
  capitalConstitutif: number;
  /** Facteur de rente viagère a_y */
  facteurRente: number;
  /** Taux trimestriel ip */
  tauxTrimestriel: number;
  /** Lx à l'âge de retraite (Ly) */
  lxRetraite: number;
  status: 'OK' | 'PARAMETRES_INVALIDES' | 'LX_INTROUVABLE' | 'LX_NUL' | 'DENOMINATEUR_INVALIDE';
}

export interface PremierPrecompteTrimestreOption {
  trimestre: 1 | 2 | 3 | 4;
  date: string;
  label: string;
}

// ─── Utilitaire d'arrondi ────────────────────────────────────────────────────

/**
 * Arrondit value au multiple de step selon le mode.
 *   'sup'    → multiple >= value  (Math.ceil)
 *   'inf'    → multiple <= value  (Math.floor)
 *   'proche' → multiple le plus proche (Math.round)
 * step <= 0  → Math.round(value)
 * value invalide → 0
 *
 * Exemples :
 *   roundToStep(12401, 100, 'sup')    → 12500
 *   roundToStep(12400, 100, 'sup')    → 12400
 *   roundToStep(12499, 100, 'inf')    → 12400
 *   roundToStep(12451, 100, 'proche') → 12500
 */
export function roundToStep(
  value: number,
  step: number,
  mode: 'sup' | 'inf' | 'proche' = 'proche'
): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  if (step <= 0) return Math.round(value);
  if (mode === 'sup') return Math.ceil(value / step) * step;
  if (mode === 'inf') return Math.floor(value / step) * step;
  return Math.round(value / step) * step;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const adherentCalculationService = {

  /**
   * Retourne les premiers jours de trimestre disponibles pour l'annee d'adhesion
   * et l'annee suivante.
   * Avec onlyOnOrAfterAdhesion=true, seuls les trimestres dont le premier jour
   * n'est pas anterieur a la date d'adhesion sont proposes.
   */
  getPremierPrecompteTrimestreOptions(
    dateAdhesion: string,
    onlyOnOrAfterAdhesion = true,
  ): PremierPrecompteTrimestreOption[] {
    const isoDateAdhesion = toIsoDate(dateAdhesion);
    if (!isoDateAdhesion) return [];

    const adhesionYear = Number(isoDateAdhesion.split('-')[0]);
    if (!Number.isInteger(adhesionYear)) return [];

    const options: PremierPrecompteTrimestreOption[] = [adhesionYear, adhesionYear + 1].flatMap((year) => [
      { trimestre: 1, date: `${year}-01-01`, label: `1er trimestre ${year}` },
      { trimestre: 2, date: `${year}-04-01`, label: `2e trimestre ${year}` },
      { trimestre: 3, date: `${year}-07-01`, label: `3e trimestre ${year}` },
      { trimestre: 4, date: `${year}-10-01`, label: `4e trimestre ${year}` },
    ]);

    return onlyOnOrAfterAdhesion
      ? options.filter((option) => option.date >= isoDateAdhesion)
      : options;
  },

  resolveDatePremierPrecompteChoisie(dateAdhesion: string, selectedDate?: string | null): string {
    const options = this.getPremierPrecompteTrimestreOptions(dateAdhesion, true);
    const selectedIso = toIsoDate(selectedDate);
    if (selectedIso && options.some((option) => option.date === selectedIso)) return selectedIso;
    return '';
  },

  /**
   * Retourne la première fin de trimestre >= dateAdhesion.
   * Fins de trimestre : 31/03, 30/06, 30/09, 31/12
   * WebDev : DatePremierPrecompte
   *
   * Exemples :
   *   2025-02-15 → 2025-03-31
   *   2025-06-30 → 2025-06-30  (date tombe exactement sur la fin de trimestre)
   *   2025-07-01 → 2025-09-30
   *   2025-11-05 → 2025-12-31
   */
  calculateDatePremierPrecompte(dateAdhesion: string): string {
    const isoDateAdhesion = toIsoDate(dateAdhesion);
    if (!isoDateAdhesion) return '';
    try {
      const parts = isoDateAdhesion.split('-');
      if (parts.length !== 3) return '';
      const year = parseInt(parts[0], 10);
      if (isNaN(year)) return '';

      // Fins de trimestre de l'année de la date d'adhésion
      const quarterEnds = [
        `${year}-03-31`,
        `${year}-06-30`,
        `${year}-09-30`,
        `${year}-12-31`,
      ];

      // Comparaison lexicographique valide pour les dates ISO yyyy-mm-dd
      for (const qEnd of quarterEnds) {
        if (qEnd >= isoDateAdhesion) return qEnd;
      }

      // Garde-fou (ne devrait jamais être atteint : 12-31 >= tout)
      return `${year}-12-31`;
    } catch (e) {
      console.error('Erreur calculateDatePremierPrecompte:', e);
      return '';
    }
  },

  /**
   * Retourne le premier jour du trimestre qui suit le trimestre du précompte.
   * WebDev : DateEffet
   *
   * Compatible avec l'ancienne date de fin de trimestre et le nouveau choix
   * manuel du trimestre, qui enregistre le premier jour du trimestre.
   *
   * Exemples :
   *   2025-03-31 → 2025-04-01
   *   2025-04-01 → 2025-07-01
   *   2025-10-01 → 2026-01-01
   *   2025-12-31 → 2026-01-01
   */
  calculateDateEffet(datePrecompte: string): string {
    const isoDatePrecompte = toIsoDate(datePrecompte);
    if (!isoDatePrecompte) return '';
    try {
      const parts = isoDatePrecompte.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return '';
      const [year, month] = parts;
      const currentQuarter = Math.floor((month - 1) / 3) + 1;
      const nextQuarterYear = currentQuarter === 4 ? year + 1 : year;
      const nextQuarterMonth = currentQuarter === 4 ? 1 : currentQuarter * 3 + 1;
      return `${nextQuarterYear}-${String(nextQuarterMonth).padStart(2, '0')}-01`;
    } catch (e) {
      console.error('Erreur calculateDateEffet:', e);
      return '';
    }
  },

  /**
   * Retourne le 31/12 de l'année où l'adhérent atteint son âge de retraite.
   * WebDev : DateRetraite_31Dec
   *
   * Exemples :
   *   1975-03-15, 60 → 2035-12-31
   *   1980-12-31, 65 → 2045-12-31
   */
  calculateDateRetraite(dateNaissance: string, ageRetraite: number): string {
    const isoDateNaissance = toIsoDate(dateNaissance);
    if (!isoDateNaissance || isNaN(ageRetraite) || ageRetraite <= 0) return '';
    try {
      const parts = isoDateNaissance.split('-').map(Number);
      if (parts.length !== 3 || isNaN(parts[0])) return '';
      const retirementYear = parts[0] + ageRetraite;
      return `${retirementYear}-12-31`;
    } catch (e) {
      console.error('Erreur calculateDateRetraite:', e);
      return '';
    }
  },

  /**
   * Nombre de trimestres entre datePrecompte et dateRetraite, bornes incluses.
   * WebDev : NbTrimestresEntreDates
   *
   * Formule :
   *   trimestreDebut = floor((moisDebut - 1) / 3) + 1
   *   trimestreFin   = floor((moisFin   - 1) / 3) + 1
   *   nb = (anneeFin - anneeDebut) * 4 + (trimestreFin - trimestreDebut) + 1
   *
   * Exemple :
   *   datePrecompte = 2025-03-31  (T1-2025)
   *   dateRetraite  = 2035-12-31  (T4-2035)
   *   nb = (2035-2025)*4 + (4-1) + 1 = 44
   *
   * Retourne 0 si le résultat est négatif ou si les dates sont invalides.
   */
  calculateNbTrimestre(datePrecompte: string, dateRetraite: string): number {
    const isoDatePrecompte = toIsoDate(datePrecompte);
    const isoDateRetraite = toIsoDate(dateRetraite);
    if (!isoDatePrecompte || !isoDateRetraite) return 0;
    try {
      const [yearDebut, monthDebut] = isoDatePrecompte.split('-').map(Number);
      const [yearFin, monthFin] = isoDateRetraite.split('-').map(Number);
      if (isNaN(yearDebut) || isNaN(monthDebut) || isNaN(yearFin) || isNaN(monthFin)) return 0;

      const trimestreDebut = Math.floor((monthDebut - 1) / 3) + 1;
      const trimestreFin = Math.floor((monthFin - 1) / 3) + 1;
      const nb = (yearFin - yearDebut) * 4 + (trimestreFin - trimestreDebut) + 1;
      return nb > 0 ? nb : 0;
    } catch (e) {
      console.error('Erreur calculateNbTrimestre:', e);
      return 0;
    }
  },

  /**
   * Calcule la part Épargne-Santé (cotisation_es) à partir de la cotisation annuelle globale.
   * NOTE C1-C : sera remplacé par le moteur actuariel CalculCotisationTrimestrielle_Simple.
   * La valeur 20% est provisoire et ne reflète pas la formule WebDev.
   */
  calculateCotisationES(cotisationAnnuelle: number, partSantePourcent: number = 20): number {
    if (!cotisationAnnuelle || isNaN(cotisationAnnuelle)) return 0;
    return Math.round((cotisationAnnuelle * partSantePourcent) / 100);
  },

  /**
   * Placeholder actuariel — non utilisé dans le formulaire.
   * Sera remplacé en C1-C par CalculCotisationTrimestrielle_Simple.
   */
  calculateProvisionsActuariellesPlaceholder(
    _ageActuel: number,
    _ageRetraite: number,
    cotisationAnnuelle: number,
    dureeCotisationTrimestres: number
  ) {
    const tauxRendementAnnuel = 0.035;
    const annees = dureeCotisationTrimestres / 4;
    let capitalFictif = 0;
    for (let i = 0; i < annees; i++) {
      capitalFictif = (capitalFictif + cotisationAnnuelle) * (1 + tauxRendementAnnuel);
    }
    return {
      capitalAcquisEstime: Math.round(capitalFictif),
      provisionMathematiqueEstime: Math.round(capitalFictif * 0.95),
      valeurRachatFictive: Math.round(capitalFictif * 0.90),
      status: 'PLACEHOLDER_ACTUARIEL',
    };
  },

  /**
   * Moteur actuariel C1-C — équivalent WebDev CalculCotisationTrimestrielle_Simple.
   *
   * Calcule la prime trimestrielle Pp nécessaire pour constituer le capital
   * permettant de servir une rente viagère R_eff à partir de ageRetraite.
   *
   * Algorithme (fidèle à la procédure WebDev) :
   *   1. Contrôles d'entrée → PARAMETRES_INVALIDES
   *   2. Ly = Lx(ageRetraite) dans la table de mortalité → LX_INTROUVABLE / LX_NUL
   *   3. v = 1 / (1 + tauxAnnuel)
   *   4. a_y = Σ[k=0..ageMax-ageRetraite-1] Lx(ageRetraite+k) * v^k  / Ly
   *   5. K = cotisationAnnuelle * pctPriseEnCharge * (1 + fraisRente) * a_y
   *   6. Si nbTrimestres <= 0 : retourner Math.round(K)
   *   7. ip = (1 + tauxAnnuel)^(1/4) - 1
   *   8. denom = (1 + ip) * ((1 + ip)^nbTrimestres - 1)
   *   9. Pp = K * ip / denom
   *  10. Pp arrondi au pas supérieur (pasArrondi, défaut 100)
   *
   * @param params - Paramètres de calcul (sans accès Supabase)
   * @returns Résultat détaillé avec statut
   */
  calculateCotisationTrimestrielleSimple(
    params: CalculCotisationTrimestrielleParams
  ): CalculCotisationTrimestrielleResult {
    const {
      cotisationAnnuelle,
      pctPriseEnCharge,
      ageRetraite,
      nbTrimestres,
      tauxAnnuel,
      fraisRente,
      ageMax,
      mortalite,
      pasArrondi = 100,
    } = params;

    const nullResult = (
      status: CalculCotisationTrimestrielleResult['status']
    ): CalculCotisationTrimestrielleResult => ({
      cotisationTrimestrielle: 0,
      capitalConstitutif: 0,
      facteurRente: 0,
      tauxTrimestriel: 0,
      lxRetraite: 0,
      status,
    });

    // ── 1. Contrôles WebDev ─────────────────────────────────────────────────
    if (
      !mortalite ||
      mortalite.length === 0 ||
      cotisationAnnuelle <= 0 ||
      pctPriseEnCharge <= 0 ||
      ageRetraite >= ageMax
    ) {
      return nullResult('PARAMETRES_INVALIDES');
    }

    // ── 2. Lire Lx à l'âge retraite ────────────────────────────────────────
    const retraitePt = mortalite.find(pt => pt.age_mort === ageRetraite);
    if (!retraitePt) return nullResult('LX_INTROUVABLE');

    const Ly = retraitePt.lx;
    if (Ly <= 0) return nullResult('LX_NUL');

    // Index age → lx pour accès O(1) dans la somme
    const lxByAge = new Map<number, number>(mortalite.map(pt => [pt.age_mort, pt.lx]));

    // ── 3-4. Facteur de rente viagère a_y ──────────────────────────────────
    const v = 1 / (1 + tauxAnnuel);
    let somme = 0;
    const nbPas = ageMax - ageRetraite; // k ∈ [0, ageMax - ageRetraite - 1]
    for (let k = 0; k < nbPas; k++) {
      const lx_k = lxByAge.get(ageRetraite + k) ?? 0;
      somme += lx_k * Math.pow(v, k);
    }
    const a_y = somme / Ly;

    // ── 5. Capital constitutif K ────────────────────────────────────────────
    const R_eff = cotisationAnnuelle * pctPriseEnCharge;
    const K = R_eff * (1 + fraisRente) * a_y;

    // ── 6. Taux trimestriel ─────────────────────────────────────────────────
    const ip = Math.pow(1 + tauxAnnuel, 1 / 4) - 1;

    // ── Cas nbTrimestres <= 0 : retourner arrondi de K (WebDev) ────────────
    if (nbTrimestres <= 0) {
      return {
        cotisationTrimestrielle: Math.round(K),
        capitalConstitutif: K,
        facteurRente: a_y,
        tauxTrimestriel: ip,
        lxRetraite: Ly,
        status: 'OK',
      };
    }

    // ── 7-8. Dénominateur de la prime périodique ────────────────────────────
    // denom = (1 + ip) * ((1 + ip)^N - 1)  ← valeur accumulée annuité-due
    const denom = (1 + ip) * (Math.pow(1 + ip, nbTrimestres) - 1);
    if (denom <= 0) {
      return {
        cotisationTrimestrielle: 0,
        capitalConstitutif: K,
        facteurRente: a_y,
        tauxTrimestriel: ip,
        lxRetraite: Ly,
        status: 'DENOMINATEUR_INVALIDE',
      };
    }

    // ── 9-10. Prime trimestrielle Pp ────────────────────────────────────────
    const Pp_brut = K * (ip / denom);
    const Pp = roundToStep(Pp_brut, pasArrondi, 'sup');

    return {
      cotisationTrimestrielle: Pp,
      capitalConstitutif: K,
      facteurRente: a_y,
      tauxTrimestriel: ip,
      lxRetraite: Ly,
      status: 'OK',
    };
  },
};
