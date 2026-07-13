/**
 * MADGI ESR — Validation du moteur actuariel vs SIMULEµ.pdf
 *
 * Vérifie que calculateCotisationTrimestrielleSimple reproduit les montants
 * de référence du fichier SIMULEµ.pdf (base 600 000 FCFA, retraite 60 et 65 ans).
 *
 * Usage : node scripts/validate-cotisation-simulation.mjs
 * Prérequis : .env rempli (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Parseur .env minimal ──────────────────────────────────────────────────────
function loadEnvFile(filePath, optional = false) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    if (optional) return;
    console.error('[ERREUR] Fichier introuvable :', filePath);
    process.exit(1);
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(ROOT, '.env'));
loadEnvFile(resolve(ROOT, '.env.local'), true);
loadEnvFile(resolve(ROOT, '.env.admin.local'), true);

// Préférer la clé service_role (bypass RLS) sinon fallback anon
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ERREUR] URL ou clé Supabase manquante dans .env / .env.admin.local');
  process.exit(1);
}

const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Grilles de référence extraites de SIMULEµ.pdf (base 600 000 FCFA) ────────

const REF_60 = {
  1: 2595100, 2: 1275200, 3: 835500, 4: 615700, 5: 484000,
  6: 396200, 7: 333600, 8: 286700, 9: 250300, 10: 221300,
  11: 197500, 12: 177800, 13: 161100, 14: 146900, 15: 134500,
  16: 123800, 17: 114300, 18: 106000, 19: 98500, 20: 91800,
  21: 85800, 22: 80300, 23: 75400, 24: 70800, 25: 66700,
  26: 62900, 27: 59400, 28: 56100, 29: 53100, 30: 50300,
};

const REF_65 = {
  1: 2337700, 2: 1148800, 3: 752600, 4: 554700, 5: 436000,
  6: 356900, 7: 300500, 8: 258300, 9: 225500, 10: 199300,
  11: 177900, 12: 160100, 13: 145100, 14: 132300, 15: 121200,
  16: 111500, 17: 103000, 18: 95500, 19: 88700, 20: 82700,
  21: 77300, 22: 72400, 23: 67900, 24: 63800, 25: 60100,
  26: 56600, 27: 53500, 28: 50500, 29: 47800, 30: 45300,
};

// ── Moteur actuariel (reprise fidèle de adherentCalculationService.ts) ────────

function roundToStep(value, step, mode = 'proche') {
  if (isNaN(value) || !isFinite(value)) return 0;
  if (step <= 0) return Math.round(value);
  if (mode === 'sup') return Math.ceil(value / step) * step;
  if (mode === 'inf') return Math.floor(value / step) * step;
  return Math.round(value / step) * step;
}

function calculateCotisationTrimestrielleSimple({
  cotisationAnnuelle,
  pctPriseEnCharge,
  ageRetraite,
  nbTrimestres,
  tauxAnnuel,
  fraisRente,
  ageMax,
  mortalite,
  pasArrondi = 100,
}) {
  const nullResult = (status) => ({
    cotisationTrimestrielle: 0,
    capitalConstitutif: 0,
    facteurRente: 0,
    tauxTrimestriel: 0,
    lxRetraite: 0,
    status,
  });

  if (
    !mortalite || mortalite.length === 0 ||
    cotisationAnnuelle <= 0 ||
    pctPriseEnCharge <= 0 ||
    ageRetraite >= ageMax
  ) {
    return nullResult('PARAMETRES_INVALIDES');
  }

  const retraitePt = mortalite.find(pt => pt.age_mort === ageRetraite);
  if (!retraitePt) return nullResult('LX_INTROUVABLE');

  const Ly = retraitePt.lx;
  if (Ly <= 0) return nullResult('LX_NUL');

  const lxByAge = new Map(mortalite.map(pt => [pt.age_mort, pt.lx]));

  const v = 1 / (1 + tauxAnnuel);
  let somme = 0;
  const nbPas = ageMax - ageRetraite;
  for (let k = 0; k < nbPas; k++) {
    const lx_k = lxByAge.get(ageRetraite + k) ?? 0;
    somme += lx_k * Math.pow(v, k);
  }
  const a_y = somme / Ly;

  const R_eff = cotisationAnnuelle * pctPriseEnCharge;
  const K = R_eff * (1 + fraisRente) * a_y;

  const ip = Math.pow(1 + tauxAnnuel, 1 / 4) - 1;

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
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  MADGI ESR — Validation moteur vs SIMULEµ.pdf');
  console.log('  Base : 600 000 FCFA | Tol. : ±100 FCFA');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ── 1. Chargement mortalité ────────────────────────────────────────────────
  console.log(`Connexion Supabase (${usingServiceRole ? 'service_role — bypass RLS' : 'anon key'})...`);
  console.log('Chargement table mortalité depuis Supabase...');
  const { data: mortData, error: mortError } = await supabase
    .from('mortalite')
    .select('age_mort, lx')
    .order('age_mort');

  if (mortError) {
    console.error('[ERREUR] Mortalité :', mortError.message);
    process.exit(1);
  }
  if (!mortData || mortData.length === 0) {
    console.error('[ERREUR] Table mortalité vide ou inaccessible.');
    process.exit(1);
  }
  console.log(`  → ${mortData.length} lignes chargées (âges ${mortData[0].age_mort} à ${mortData[mortData.length - 1].age_mort})`);

  // ── 2. Chargement paramètres généraux ─────────────────────────────────────
  console.log('Chargement parametres_generaux depuis Supabase...');
  const { data: paramData, error: paramError } = await supabase
    .from('parametres_generaux')
    .select('code, valeur')
    .eq('actif', true);

  if (paramError) {
    console.error('[ERREUR] parametres_generaux :', paramError.message);
    process.exit(1);
  }

  const findVal = (code) => paramData?.find(p => p.code === code)?.valeur ?? null;
  const tauxGarStr = findVal('TAUX_GAR');
  const fraisRenteStr = findVal('FRAIS_RENTE');
  const ageMaxStr = findVal('AGE_MAX');

  const missing = [];
  if (!tauxGarStr) missing.push('TAUX_GAR');
  if (!fraisRenteStr) missing.push('FRAIS_RENTE');
  if (!ageMaxStr) missing.push('AGE_MAX');

  if (missing.length > 0) {
    console.error(`[ERREUR] Paramètres manquants dans parametres_generaux : ${missing.join(', ')}`);
    process.exit(1);
  }

  const tauxAnnuel = parseFloat(tauxGarStr) / 100;
  const fraisRente = parseFloat(fraisRenteStr) / 100;
  const ageMax = parseInt(ageMaxStr, 10);

  console.log(`  → TAUX_GAR=${tauxGarStr}% → ${tauxAnnuel}`);
  console.log(`  → FRAIS_RENTE=${fraisRenteStr}% → ${fraisRente}`);
  console.log(`  → AGE_MAX=${ageMax}`);

  if (isNaN(tauxAnnuel) || isNaN(fraisRente) || isNaN(ageMax)) {
    console.error('[ERREUR] Conversion numérique échouée pour un ou plusieurs paramètres.');
    process.exit(1);
  }

  // ── 3. Exécution des cas de test ──────────────────────────────────────────
  const BASE = 600000;
  const TOLERANCE = 100;

  const cases = [
    ...Object.entries(REF_60).map(([annee, ref]) => ({ ageRetraite: 60, annee: +annee, ref })),
    ...Object.entries(REF_65).map(([annee, ref]) => ({ ageRetraite: 65, annee: +annee, ref })),
  ];

  const results = [];

  for (const { ageRetraite, annee, ref } of cases) {
    const nbTrimestres = annee * 4;
    const calc = calculateCotisationTrimestrielleSimple({
      cotisationAnnuelle: BASE,
      pctPriseEnCharge: 1,
      ageRetraite,
      nbTrimestres,
      tauxAnnuel,
      fraisRente,
      ageMax,
      mortalite: mortData,
      pasArrondi: 100,
    });

    const montantCalc = calc.cotisationTrimestrielle;
    const ecart = montantCalc - ref;
    const ecartPct = ref > 0 ? (ecart / ref) * 100 : 0;
    const statut = Math.abs(ecart) <= TOLERANCE ? 'OK' : 'ECART';

    results.push({
      ageRetraite,
      annee,
      nbTrimestres,
      ref,
      montantCalc,
      ecart,
      ecartPct,
      statut,
      calcStatus: calc.status,
      a_y: calc.facteurRente,
      K: calc.capitalConstitutif,
    });
  }

  // ── 4. Tableau récapitulatif ──────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────────────────────────────────────────────────');
  console.log(' RET  ANS   NB-T   RÉFÉRENCE    CALCULÉ      ÉCART    ÉCART%   STATUT');
  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────');

  for (const r of results) {
    const tag = r.statut === 'OK' ? '  OK  ' : '⚠ ECART';
    console.log(
      ` ${r.ageRetraite}   ${String(r.annee).padStart(2)}   ${String(r.nbTrimestres).padStart(3)}` +
      `   ${String(r.ref).padStart(10)}   ${String(r.montantCalc).padStart(10)}` +
      `   ${String(r.ecart >= 0 ? '+' + r.ecart : r.ecart).padStart(8)}` +
      `   ${r.ecartPct.toFixed(2).padStart(6)}%   ${tag}`
    );
  }

  console.log('─────────────────────────────────────────────────────────────────────────────────────────────────');

  // ── 5. Cas obligatoires ───────────────────────────────────────────────────
  console.log('\n📌 Cas obligatoires :');
  const mandatory = [
    { ageRetraite: 60, annee: 10, attendu: 221300 },
    { ageRetraite: 60, annee: 18, attendu: 106000 },
    { ageRetraite: 65, annee: 10, attendu: 199300 },
    { ageRetraite: 65, annee: 30, attendu: 45300 },
  ];
  for (const m of mandatory) {
    const r = results.find(x => x.ageRetraite === m.ageRetraite && x.annee === m.annee);
    if (!r) { console.log(`  RET${m.ageRetraite} AN${m.annee} : introuvable`); continue; }
    const icon = r.statut === 'OK' ? '✓' : '✗';
    console.log(
      `  ${icon} Ret${m.ageRetraite} ans / ${m.annee} ans ` +
      `→ attendu ${m.attendu.toLocaleString()} | calculé ${r.montantCalc.toLocaleString()} | écart ${r.ecart >= 0 ? '+' : ''}${r.ecart}`
    );
  }

  // ── 6. Résumé statistique ─────────────────────────────────────────────────
  const total = results.length;
  const nbOk = results.filter(r => r.statut === 'OK').length;
  const nbEcart = total - nbOk;
  const ecarts = results.filter(r => r.statut === 'ECART');
  const maxEcartAbs = Math.max(...results.map(r => Math.abs(r.ecart)));

  console.log('\n══════════════════ RÉSUMÉ ══════════════════');
  console.log(`  Cas testés      : ${total}`);
  console.log(`  Cas OK (±${TOLERANCE}) : ${nbOk}`);
  console.log(`  Cas en écart    : ${nbEcart}`);
  console.log(`  Écart max abs.  : ${maxEcartAbs.toLocaleString()} FCFA`);

  if (nbEcart === 0) {
    console.log('\n✅ Le moteur est conforme au fichier SIMULEµ.pdf pour les cas testés.');
  } else {
    console.log(`\n❌ ${nbEcart} cas hors tolérance.`);
    console.log('\n  Premiers cas en écart :');
    for (const r of ecarts.slice(0, 5)) {
      console.log(
        `    Ret${r.ageRetraite} / AN${r.annee} (${r.nbTrimestres}T) : ` +
        `ref=${r.ref.toLocaleString()} | calc=${r.montantCalc.toLocaleString()} | écart=${r.ecart >= 0 ? '+' : ''}${r.ecart} (${r.ecartPct.toFixed(2)}%)`
      );
    }

    // ── 7. Diagnostic détaillé sur le premier cas en écart ─────────────────
    const premier = ecarts[0];
    console.log(`\n  Diagnostic (premier cas en écart : Ret${premier.ageRetraite} / AN${premier.annee}) :`);
    console.log(`    a_y (facteur rente) = ${premier.a_y.toFixed(8)}`);
    console.log(`    K (capital)         = ${premier.K.toFixed(2)}`);
    console.log(`    nbTrimestres        = ${premier.nbTrimestres}`);
    console.log(`    tauxAnnuel          = ${tauxAnnuel} (${tauxGarStr}%)`);
    console.log(`    fraisRente          = ${fraisRente} (${fraisRenteStr}%)`);
    console.log(`    ageMax              = ${ageMax}`);
    console.log(`    Statut moteur       = ${premier.calcStatus}`);

    console.log('\n  Causes probables à investiguer :');
    const firstEcartPct = Math.abs(ecarts[0].ecartPct);
    if (firstEcartPct > 10) {
      console.log('    → Écart > 10% : formule actuarielle, table mortalité, ou ageMax différents');
    } else if (firstEcartPct > 2) {
      console.log('    → Écart 2-10% : taux ou frais légèrement différents, ou nbTrimestres mal calculé');
    } else {
      console.log('    → Écart < 2% : arrondi final (sup vs proche vs inf) ou arrondi intermédiaire');
    }

    // Vérifier si la moitié des trimestres corrige
    const premierAlt4T = calculateCotisationTrimestrielleSimple({
      cotisationAnnuelle: BASE,
      pctPriseEnCharge: 1,
      ageRetraite: premier.ageRetraite,
      nbTrimestres: premier.annee * 4 + 4,
      tauxAnnuel,
      fraisRente,
      ageMax,
      mortalite: mortData,
      pasArrondi: 100,
    });
    console.log(`\n    Test alternatif nbT=${premier.annee * 4 + 4} (annees*4+4) : ${premierAlt4T.cotisationTrimestrielle.toLocaleString()}`);

    const premierAlt3T = calculateCotisationTrimestrielleSimple({
      cotisationAnnuelle: BASE,
      pctPriseEnCharge: 1,
      ageRetraite: premier.ageRetraite,
      nbTrimestres: premier.annee * 4 - 1,
      tauxAnnuel,
      fraisRente,
      ageMax,
      mortalite: mortData,
      pasArrondi: 100,
    });
    console.log(`    Test alternatif nbT=${premier.annee * 4 - 1} (annees*4-1) : ${premierAlt3T.cotisationTrimestrielle.toLocaleString()}`);

    // Test arrondi inférieur
    const altInf = calculateCotisationTrimestrielleSimple({
      cotisationAnnuelle: BASE,
      pctPriseEnCharge: 1,
      ageRetraite: premier.ageRetraite,
      nbTrimestres: premier.annee * 4,
      tauxAnnuel,
      fraisRente,
      ageMax,
      mortalite: mortData,
      pasArrondi: 100,
    });
    // Recalc avec round inférieur manuellement
    const ip_diag = Math.pow(1 + tauxAnnuel, 1 / 4) - 1;
    const denom_diag = (1 + ip_diag) * (Math.pow(1 + ip_diag, premier.annee * 4) - 1);
    const Pp_brut_diag = premier.K * (ip_diag / denom_diag);
    const roundProche = roundToStep(Pp_brut_diag, 100, 'proche');
    const roundInf = roundToStep(Pp_brut_diag, 100, 'inf');
    console.log(`\n    Pp brut (non arrondi) : ${Pp_brut_diag.toFixed(2)}`);
    console.log(`    Arrondi supérieur (actuel) : ${roundToStep(Pp_brut_diag, 100, 'sup')}`);
    console.log(`    Arrondi proche              : ${roundProche}`);
    console.log(`    Arrondi inférieur           : ${roundInf}`);
    console.log(`    Référence attendue          : ${premier.ref}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
