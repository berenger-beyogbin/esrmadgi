export type RachatStatut = 'DOSSIER_OUVERT'|'EN_CONTROLE'|'VALIDE'|'PAYE'|'REJETE'|'ANNULE';

export const rachatTransitions: Readonly<Record<RachatStatut, readonly RachatStatut[]>> = {
  DOSSIER_OUVERT: ['EN_CONTROLE','ANNULE'],
  EN_CONTROLE: ['VALIDE','REJETE','ANNULE'],
  VALIDE: ['PAYE','ANNULE'],
  PAYE: [], REJETE: [], ANNULE: [],
};

export function rachatTransitionPermise(actuel:RachatStatut, suivant:RachatStatut):boolean {
  return rachatTransitions[actuel]?.includes(suivant) ?? false;
}

export function ancienneteAnneesCompletes(debut:string, fin:string):number {
  const d=new Date(`${debut}T00:00:00Z`), f=new Date(`${fin}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(f.getTime()) || f<d) return -1;
  let n=f.getUTCFullYear()-d.getUTCFullYear();
  if (f.getUTCMonth()<d.getUTCMonth() || (f.getUTCMonth()===d.getUTCMonth() && f.getUTCDate()<d.getUTCDate())) n--;
  return n;
}

