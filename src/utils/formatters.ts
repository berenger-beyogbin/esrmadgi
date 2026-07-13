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
