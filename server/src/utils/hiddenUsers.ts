const HIDDEN_USER_MATRICULES = new Set(['395047Y']);

export function isHiddenUserMatricule(matricule: string | null | undefined): boolean {
  return HIDDEN_USER_MATRICULES.has(String(matricule ?? '').trim().toUpperCase());
}
