/**
 * Utilitaires de presentation uniquement.
 * Les calculs utilisent toujours des dates ISO yyyy-mm-dd.
 */

export function formatFCFA(val: number | null | undefined): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(Number(val))
    .replace('XOF', 'FCFA');
}

export function toIsoDate(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  const fr = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const dashedFr = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const match = iso ?? fr ?? dashedFr;
  if (!match) return '';

  const year = iso ? Number(match[1]) : Number(match[3]);
  const month = Number(match[2]);
  const day = iso ? Number(match[3]) : Number(match[1]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDateFr(dStr: string | null | undefined): string {
  if (!dStr) return '-';
  const iso = toIsoDate(dStr);
  if (!iso) return String(dStr);
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export function formatNumberFr(val: number | null | undefined): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '-';
  return new Intl.NumberFormat('fr-FR').format(Number(val));
}

const UNITES = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

function centainesEnLettres(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const reste = n % 100;
  let mots = '';

  if (c > 0) {
    mots += c === 1 ? 'cent' : `${UNITES[c]} cent`;
    if (c > 1 && reste === 0) mots += 's';
    if (reste > 0) mots += ' ';
  }

  if (reste > 0) {
    if (reste < 20) {
      mots += UNITES[reste];
    } else {
      const d = Math.floor(reste / 10);
      const u = reste % 10;
      if (d === 7 || d === 9) {
        mots += `${DIZAINES[d - 1]}-${UNITES[10 + u]}`;
      } else {
        mots += DIZAINES[d];
        if (u === 1 && d !== 8) mots += ' et un';
        else if (u > 0) mots += `-${UNITES[u]}`;
        else if (d === 8) mots += 's';
      }
    }
  }

  return mots;
}

export function nombreEnLettres(valeur: number | null | undefined): string {
  const n = Math.round(Number(valeur ?? 0));
  if (!isFinite(n) || n <= 0) return 'zéro';

  const groupes = [
    { valeur: 1_000_000_000, singulier: 'milliard', pluriel: 'milliards' },
    { valeur: 1_000_000, singulier: 'million', pluriel: 'millions' },
    { valeur: 1_000, singulier: 'mille', pluriel: 'mille' },
  ];

  let reste = n;
  const parties: string[] = [];

  for (const groupe of groupes) {
    const quotient = Math.floor(reste / groupe.valeur);
    if (quotient > 0) {
      if (groupe.valeur === 1000 && quotient === 1) {
        parties.push(groupe.singulier);
      } else {
        const mot = centainesEnLettres(quotient);
        parties.push(`${mot} ${quotient > 1 ? groupe.pluriel : groupe.singulier}`);
      }
      reste %= groupe.valeur;
    }
  }

  if (reste > 0 || parties.length === 0) {
    parties.push(centainesEnLettres(reste));
  }

  return parties.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function montantEnLettresFCFA(valeur: number | null | undefined): string {
  const mots = nombreEnLettres(valeur);
  const capitalized = mots.charAt(0).toUpperCase() + mots.slice(1);
  return `${capitalized} francs CFA`;
}
