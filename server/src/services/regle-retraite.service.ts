import { parametresRepository } from '../repositories/parametres.repository';
import { calculerAbattementPromo } from './promotion-depart-retraite.service';

type RetirementPayload = {
  matricule: string;
  grade_id: string;
  date_naissance: string;
  date_precompte?: string | null;
  age_retraite: number;
  date_retraite: string;
  nb_trimestre: number;
  cotisation_annuelle: number;
  cotisation_es: number;
  cotisation_es_avant_abattement?: number | null;
  taux_abattement_promo?: number | null;
  palier_abattement_promo?: number | null;
};

type Row = Record<string, unknown>;

export function estMatriculePriveMadgi(matricule?: string | null): boolean {
  return /^\d{5}P$/.test(String(matricule ?? '').trim().toUpperCase());
}

export function resoudreAgeRetraite(matricule: string, ageRetraiteGrade: number): number {
  return estMatriculePriveMadgi(matricule) ? 60 : ageRetraiteGrade;
}

export function calculerDateRetraite(dateNaissance: string, ageRetraite: number): string {
  const match = String(dateNaissance).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !Number.isInteger(ageRetraite) || ageRetraite <= 0) return '';
  return `${Number(match[1]) + ageRetraite}-12-31`;
}

export function calculerNombreTrimestres(datePrecompte: string, dateRetraite: string): number {
  const debut = String(datePrecompte).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const fin = String(dateRetraite).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!debut || !fin) return 0;
  const trimestreDebut = Math.floor((Number(debut[2]) - 1) / 3) + 1;
  const trimestreFin = Math.floor((Number(fin[2]) - 1) / 3) + 1;
  return Math.max(0, (Number(fin[1]) - Number(debut[1])) * 4 + trimestreFin - trimestreDebut + 1);
}

function valeurParametre(rows: Row[], code: string): number {
  const value = Number(rows.find((row) => row.code === code)?.valeur);
  return Number.isFinite(value) ? value : NaN;
}

function calculerCotisationInitiale(input: {
  renteAnnuelle: number;
  ageRetraite: number;
  ageMaximum: number;
  nombreTrimestres: number;
  tauxAnnuelPourcent: number;
  fraisRentePourcent: number;
  mortalite: Array<{ age: number; lx: number }>;
}): number {
  const lx = new Map(input.mortalite.map((point) => [point.age, point.lx]));
  const ly = lx.get(input.ageRetraite);
  if (!ly || ly <= 0 || input.nombreTrimestres < 0 || input.renteAnnuelle <= 0) return 0;
  const tauxAnnuel = input.tauxAnnuelPourcent / 100;
  const v = 1 / (1 + tauxAnnuel);
  let somme = 0;
  for (let age = input.ageRetraite; age < input.ageMaximum; age += 1) {
    somme += (lx.get(age) ?? 0) * Math.pow(v, age - input.ageRetraite);
  }
  const capital = Math.ceil(
    (input.renteAnnuelle * (1 + input.fraisRentePourcent / 100) * (somme / ly) - Number.EPSILON) / 100,
  ) * 100;
  if (input.nombreTrimestres === 0) return capital;
  const tauxTrimestriel = Math.pow(1 + tauxAnnuel, 0.25) - 1;
  const denominateur = (1 + tauxTrimestriel)
    * (Math.pow(1 + tauxTrimestriel, input.nombreTrimestres) - 1);
  if (tauxTrimestriel <= 0 || denominateur <= 0) return 0;
  return Math.ceil((capital * tauxTrimestriel / denominateur - Number.EPSILON) / 100) * 100;
}

/** Recalcule systématiquement les données contractuelles depuis le matricule et le grade. */
export async function appliquerRegleRetraite<T extends RetirementPayload>(payload: T): Promise<T> {
  const [grades, params, mortalite, promoParam] = await Promise.all([
    parametresRepository.findGrades() as Promise<Row[]>,
    parametresRepository.findParametresGeneraux() as Promise<Row[]>,
    parametresRepository.findMortalite() as Promise<Row[]>,
    parametresRepository.findParametreGeneralByCode('PROMO_ABATTEMENT_RETRAITE') as Promise<Row | null>,
  ]);
  const grade = grades.find((row) => String(row.id_grade) === String(payload.grade_id));
  const ageGrade = Number(grade?.age_retraite);
  const cotisationAnnuelle = Number(grade?.cotisation_annuelle);
  if (!Number.isFinite(ageGrade) || ageGrade <= 0 || !Number.isFinite(cotisationAnnuelle) || cotisationAnnuelle <= 0) {
    throw new Error('Le grade selectionne ne permet pas le calcul de la retraite.');
  }

  const ageRetraite = resoudreAgeRetraite(payload.matricule, Math.trunc(ageGrade));
  const dateRetraite = calculerDateRetraite(payload.date_naissance, ageRetraite);
  const nbTrimestre = calculerNombreTrimestres(String(payload.date_precompte ?? ''), dateRetraite);
  const tauxGar = valeurParametre(params, 'TAUX_GAR');
  const fraisRente = valeurParametre(params, 'FRAIS_RENTE');
  const ageMaximum = Math.trunc(valeurParametre(params, 'AGE_MAX'));
  const cotisationEs = calculerCotisationInitiale({
    renteAnnuelle: cotisationAnnuelle,
    ageRetraite,
    ageMaximum,
    nombreTrimestres: nbTrimestre,
    tauxAnnuelPourcent: tauxGar,
    fraisRentePourcent: fraisRente,
    mortalite: mortalite.map((row) => ({ age: Number(row.age_mort), lx: Number(row.lx) })),
  });
  if (!dateRetraite || nbTrimestre < 0 || cotisationEs <= 0) {
    throw new Error('Le recalcul actuariel de la retraite est impossible avec les paramètres actuels.');
  }

  const abattement = calculerAbattementPromo({
    libelleGrade: String(grade?.libelle_grade ?? ''),
    nbTrimestreRestant: nbTrimestre,
    cotisationTrimestrielleStandard: cotisationEs,
    dateReference: new Date().toISOString().slice(0, 10),
    fenetre: promoParam
      ? {
          actif: Boolean((promoParam as Row).actif),
          date_debut: (promoParam as Row).date_debut as string | null,
          date_fin: (promoParam as Row).date_fin as string | null,
        }
      : null,
  });

  return {
    ...payload,
    age_retraite: ageRetraite,
    date_retraite: dateRetraite,
    nb_trimestre: nbTrimestre,
    cotisation_annuelle: cotisationAnnuelle,
    cotisation_es: abattement.applique ? abattement.cotisationApresAbattement : cotisationEs,
    cotisation_es_avant_abattement: abattement.applique ? cotisationEs : null,
    taux_abattement_promo: abattement.applique ? abattement.tauxPourcent : null,
    palier_abattement_promo: abattement.applique ? abattement.palier : null,
  };
}
