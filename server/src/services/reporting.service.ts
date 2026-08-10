import { reportingRepository } from '../repositories/reporting.repository';

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function statutPrecompteActuel(rows: Array<{ annee: number; trimestre: number; statut_precompte: string }>): string {
  if (rows.length === 0) return 'PAS_A_JOUR';
  const dernier = [...rows].sort((a, b) => b.annee - a.annee || b.trimestre - a.trimestre)[0];
  return dernier.statut_precompte === 'ENCAISSE' ? 'A_JOUR' : 'PAS_A_JOUR';
}

function statutRenteActuel(rows: Array<{ annee: number; trimestre: number; statut: string }>): string {
  if (rows.length === 0) return 'PAS_A_JOUR';
  const dernier = [...rows].sort((a, b) => b.annee - a.annee || b.trimestre - a.trimestre)[0];
  return dernier.statut === 'PAYEE' ? 'A_JOUR' : 'PAS_A_JOUR';
}

function adherentBase(row: any) {
  return {
    matricule: row.matricule,
    nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
    grade: row.grade ?? '',
    dateAdhesion: row.date_souscription,
    datePremierPrecompte: row.date_precompte,
    primeTrimestrielle: Number(row.cotisation_es ?? 0),
  };
}

export const reportingService = {
  async listeAdherents(): Promise<unknown[]> {
    const adherents = await reportingRepository.findAdherents('TOUS');
    const matricules = adherents.map((row) => row.matricule).filter(Boolean);
    const precomptes = await reportingRepository.findPrecomptesParMatricules(matricules);
    const parMatricule = groupBy(precomptes, (row) => row.matricule);
    return adherents.map((row) => ({
      ...adherentBase(row),
      statut: statutPrecompteActuel(parMatricule.get(row.matricule) ?? []),
    }));
  },

  async adherentsActifs(): Promise<unknown[]> {
    const adherents = await reportingRepository.findAdherents('ACTIFS');
    return adherents.map((row) => adherentBase(row));
  },

  async adherentsRetraites(): Promise<unknown[]> {
    const adherents = await reportingRepository.findAdherents('RETRAITES');
    return adherents.map((row) => ({
      ...adherentBase(row),
      dateDepartRetraite: row.date_retraite,
    }));
  },

  async adherentsRetraitesParStatut(): Promise<unknown[]> {
    const adherents = await reportingRepository.findAdherents('RETRAITES');
    const rentes = await reportingRepository.findRentesActives();
    const renteParAdherent = new Map(rentes.map((row) => [row.id_adherent, row]));
    const idsRentes = rentes.map((row) => row.id_rente);
    const versements = await reportingRepository.findVersementsParRentes(idsRentes);
    const versementsParRente = groupBy(versements, (row) => row.id_rente);
    return adherents.map((row) => {
      const rente = renteParAdherent.get(row.id_adherent);
      const statut = rente ? statutRenteActuel(versementsParRente.get(rente.id_rente) ?? []) : 'PAS_A_JOUR';
      return {
        matricule: row.matricule,
        nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
        grade: row.grade ?? '',
        dateAdhesion: row.date_souscription,
        primeTrimestrielle: Number(row.cotisation_es ?? 0),
        dateDepartRetraite: row.date_retraite,
        montantRestantDu: Number(rente?.capital_restant ?? 0),
        statut,
      };
    });
  },

  async rachatsResiliations(): Promise<unknown[]> {
    const rows = await reportingRepository.findRachatsResiliations();
    return rows.map((row) => ({
      matricule: row.matricule,
      nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
      dateDemande: row.date_demande,
      statut: row.statut,
      capitalVerse: Number(row.capital_verse ?? 0),
      penalite: Number(row.penalite ?? 0),
      montantNet: Number(row.montant_net ?? 0),
    }));
  },

  async agentsDecedes(): Promise<unknown[]> {
    const rows = await reportingRepository.findPrestationsParType(['DECES']);
    return rows.map((row) => ({
      matricule: row.matricule,
      nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
      dateEvenement: row.date_evenement,
      dateDemande: row.date_demande,
      statut: row.statut_prestation,
      montantDu: Number(row.montant_du ?? 0),
      montantPaye: Number(row.montant_paye ?? 0),
    }));
  },

  async agentsDecedesCapitalVerse(): Promise<unknown[]> {
    const rows = (await reportingRepository.findPrestationsParType(['DECES'])).filter(
      (row) => row.statut_prestation === 'PAYE',
    );
    const idsAdherents = rows.map((row) => Number(row.id_adherent));
    const beneficiaires = await reportingRepository.findBeneficiairesParAdherents(idsAdherents);
    const parAdherent = groupBy(beneficiaires, (row) => row.id_adherent);
    return rows.map((row) => ({
      matricule: row.matricule,
      nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
      dateEvenement: row.date_evenement,
      datePaiement: row.date_paiement,
      montantPaye: Number(row.montant_paye ?? 0),
      ayantsDroit: (parAdherent.get(row.id_adherent) ?? [])
        .map((b) => `${b.nom_benef ?? ''} ${b.prenoms_benef ?? ''}`.trim())
        .join(', '),
    }));
  },

  async getCimaC20(annee: number): Promise<unknown> {
    const [cotisations, comptes, prestations] = await Promise.all([
      reportingRepository.findCotisationsAnnee(annee),
      reportingRepository.findComptes(),
      reportingRepository.findPrestationsAnnee(annee),
    ]);

    const trimestres = [1, 2, 3, 4].map((trimestre) => {
      const periode = `${annee}T${trimestre}`;
      const rows = cotisations.filter((row) => row.periode === periode);
      const encaissees = rows.filter((row) => row.statut_detail === 'ENCAISSEE');
      const adherents = new Set(encaissees.map((row) => String(row.id_adherent)));
      return {
        periode,
        nombreAdherents: adherents.size,
        cotisationsPrevues: rows.reduce((sum, row) => sum + Number(row.montant ?? 0), 0),
        cotisationsEncaissees: encaissees.reduce((sum, row) => sum + Number(row.montant ?? 0), 0),
        nombreMouvements: encaissees.length,
      };
    });

    const total = (key: 'cotisationsPrevues' | 'cotisationsEncaissees' | 'nombreMouvements') =>
      trimestres.reduce((sum, row) => sum + Number(row[key]), 0);
    const provisions = comptes.reduce((sum, row) => sum + Number(row.pm ?? 0), 0);
    const capitalAcquis = comptes.reduce((sum, row) => sum + Number(row.capital_acquis ?? 0), 0);
    const valeurRachat = comptes.reduce((sum, row) => sum + Number(row.valeur_rachat ?? 0), 0);
    const prestationsPayees = prestations
      .filter((row) => row.statut_prestation === 'PAYE')
      .reduce((sum, row) => sum + Number(row.montant_paye ?? row.montant_du ?? 0), 0);

    return {
      etat: 'CIMA C-20 ESR',
      annee,
      genereLe: new Date().toISOString(),
      trimestres,
      totaux: {
        cotisationsPrevues: total('cotisationsPrevues'),
        cotisationsEncaissees: total('cotisationsEncaissees'),
        nombreMouvements: total('nombreMouvements'),
        capitalAcquis,
        provisionsMathematiques: provisions,
        valeurRachat,
        prestationsPayees,
      },
      controles: {
        ecartCotisations: total('cotisationsPrevues') - total('cotisationsEncaissees'),
        comptesAvecProvision: comptes.filter((row) => Number(row.pm ?? 0) > 0).length,
        nombreComptes: comptes.length,
      },
    };
  },
};
