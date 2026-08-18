export const FICHE_ADHERENT_PREVIEW_KEY = 'madgi-esr:fiche-adherent-preview';

export function getFicheAdherentPreviewId(): string | null {
  const value = window.sessionStorage.getItem(FICHE_ADHERENT_PREVIEW_KEY)?.trim();
  return value && /^\d+$/.test(value) ? value : null;
}

export function nettoyerAncienneUrlFicheAdherent(): string | null {
  const url = new URL(window.location.href);
  const legacyId = url.searchParams.get('fiche-adherent')?.trim() ?? '';
  if (!/^\d+$/.test(legacyId)) return null;

  window.sessionStorage.setItem(FICHE_ADHERENT_PREVIEW_KEY, legacyId);
  url.searchParams.delete('fiche-adherent');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return legacyId;
}
