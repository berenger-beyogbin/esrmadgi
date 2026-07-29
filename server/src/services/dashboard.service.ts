import { AuthenticatedUser } from '../types';
import {
  DashboardAdherentRow,
  DashboardCotisationRow,
  DashboardPrestationRow,
  DashboardScope,
  dashboardRepository,
} from '../repositories/dashboard.repository';

export interface DerniereCotisation {
  date: string | null;
  montant: number;
  adherent: string;
  matricule: string;
  periode: string;
  source: string;
}

export interface DernierePrestation {
  date: string | null;
  adherent: string;
  type: string;
  statut: string;
  montant: number;
}

export interface DashboardStats {
  totalAdherentsActifs: number;
  cotisationTrimestrielleTotale: number;
  provisionTotale: number;
  capitalAcquisTotal: number;
  nombrePrestations: number;
  repartition: {
    actif: number;
    retraite: number;
    decede: number;
    autre: number;
  };
  totalPm: number;
  dernieresCotisations: DerniereCotisation[];
  dernieresPrestations: DernierePrestation[];
}

const emptyStats: DashboardStats = {
  totalAdherentsActifs: 0,
  cotisationTrimestrielleTotale: 0,
  provisionTotale: 0,
  capitalAcquisTotal: 0,
  nombrePrestations: 0,
  repartition: {
    actif: 0,
    retraite: 0,
    decede: 0,
    autre: 0,
  },
  totalPm: 0,
  dernieresCotisations: [],
  dernieresPrestations: [],
};

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function fullName(row: { nom?: string | null; prenoms?: string | null }): string {
  return `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim();
}

function isRetraite(row: DashboardAdherentRow): boolean {
  return row.retraite === true || String(row.statut ?? '').toUpperCase() === 'RETRAITE';
}

function isDecede(row: DashboardAdherentRow): boolean {
  return row.decede === true || String(row.statut ?? '').toUpperCase() === 'DECEDE';
}

function isActif(row: DashboardAdherentRow): boolean {
  const statut = row.statut;
  const activeStatus = statut === true || String(statut ?? '').toUpperCase() === 'ACTIF';
  return activeStatus && !isRetraite(row) && !isDecede(row);
}

function scopeForUser(user: AuthenticatedUser): DashboardScope | undefined {
  if (user.role !== 'ADHERENT') return undefined;
  return user.matricule ? { matricule: user.matricule } : { matricule: '__NO_MATRICULE__' };
}

function mapCotisation(row: DashboardCotisationRow): DerniereCotisation {
  return {
    date: row.date_valeur ?? null,
    montant: toNumber(row.montant),
    adherent: fullName(row),
    matricule: row.matricule ?? '',
    periode: row.periode ?? '',
    source: row.source ?? '',
  };
}

function mapPrestation(row: DashboardPrestationRow): DernierePrestation {
  return {
    date: row.date_demande ?? null,
    adherent: fullName(row),
    type: row.type_prestation ?? '',
    statut: row.statut_prestation ?? '',
    montant: toNumber(row.montant ?? row.montant_du),
  };
}

export const dashboardService = {
  async getStats(user: AuthenticatedUser): Promise<DashboardStats> {
    const scope = scopeForUser(user);
    const rows = await dashboardRepository.findAdherents(scope);
    if (rows.length === 0) return emptyStats;

    const actifs = rows.filter(isActif);
    const retraites = rows.filter(isRetraite);
    const decedes = rows.filter(isDecede);
    const autreCount = rows.length - actifs.length - retraites.length - decedes.length;

    const cotisationTrimestrielleTotale = actifs.reduce(
      (sum, row) => sum + toNumber(row.cotisation_es),
      0,
    );
    const capitalAcquisTotal = rows.reduce((sum, row) => sum + toNumber(row.capital_acquis), 0);
    const totalPm = rows.reduce((sum, row) => sum + toNumber(row.pm), 0);
    const provisionTotale = totalPm > 0 ? totalPm : capitalAcquisTotal;

    const [dernieresCotisations, dernieresPrestations, nombrePrestations] = await Promise.all([
      dashboardRepository.findRecentCotisations(scope),
      dashboardRepository.findRecentPrestations(scope),
      dashboardRepository.countPrestations(scope),
    ]);

    return {
      totalAdherentsActifs: actifs.length,
      cotisationTrimestrielleTotale,
      provisionTotale,
      capitalAcquisTotal,
      nombrePrestations,
      repartition: {
        actif: actifs.length,
        retraite: retraites.length,
        decede: decedes.length,
        autre: Math.max(autreCount, 0),
      },
      totalPm,
      dernieresCotisations: dernieresCotisations.map(mapCotisation),
      dernieresPrestations: dernieresPrestations.map(mapPrestation),
    };
  },
};
