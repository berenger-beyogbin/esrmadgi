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
  return ['ENCAISSE', 'REGULARISE'].includes(dernier.statut_precompte) ? 'A_JOUR' : 'PAS_A_JOUR';
}

function statutRenteActuel(rows: Array<{ annee: number; trimestre: number; statut: string }>): string {
  if (rows.length === 0) return 'PAS_A_JOUR';
  const dernier = [...rows].sort((a, b) => b.annee - a.annee || b.trimestre - a.trimestre)[0];
  return dernier.statut === 'PAYEE' ? 'A_JOUR' : 'PAS_A_JOUR';
}

function rachatLigne(row: any) {
  return {
    matricule: row.matricule,
    nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
    dateDemande: row.date_demande,
    statut: row.statut,
    capitalVerse: Number(row.capital_verse ?? 0),
    penalite: Number(row.penalite ?? 0),
    montantNet: Number(row.montant_net ?? 0),
  };
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

  async retraitesParStatutFiltre(cible: 'A_JOUR' | 'PAS_A_JOUR'): Promise<unknown[]> {
    const lignes = (await this.adherentsRetraitesParStatut()) as Array<{ statut: string }>;
    return lignes.filter((row) => row.statut === cible);
  },

  async actifsParStatut(): Promise<Array<{ statut: string; [key: string]: unknown }>> {
    const adherents = await reportingRepository.findAdherents('ACTIFS');
    const matricules = adherents.map((row) => row.matricule).filter(Boolean);
    const precomptes = await reportingRepository.findPrecomptesParMatricules(matricules);
    const parMatricule = groupBy(precomptes, (row) => row.matricule);
    return adherents.map((row) => ({
      ...adherentBase(row),
      statut: statutPrecompteActuel(parMatricule.get(row.matricule) ?? []),
    }));
  },

  async actifsParStatutFiltre(cible: 'A_JOUR' | 'PAS_A_JOUR'): Promise<unknown[]> {
    const lignes = await this.actifsParStatut();
    return lignes.filter((row) => row.statut === cible);
  },

  async ayantsDroitGlobal(): Promise<unknown[]> {
    const beneficiaires = await reportingRepository.findBeneficiairesTous();
    const idsAdherents = Array.from(new Set(beneficiaires.map((row) => Number(row.id_adherent))));
    const adherents = await reportingRepository.findAdherentsParIds(idsAdherents);
    const parAdherent = new Map(adherents.map((row) => [row.id_adherent, row]));
    return beneficiaires.map((row) => {
      const adherent = parAdherent.get(row.id_adherent);
      return {
        matriculeAdherent: adherent?.matricule ?? '',
        nomPrenomsAdherent: adherent ? `${adherent.nom ?? ''} ${adherent.prenoms ?? ''}`.trim() : '',
        nomPrenomsAyantDroit: `${row.nom_benef ?? ''} ${row.prenoms_benef ?? ''}`.trim(),
        contact: row.contact ?? '',
        lien: row.lien ?? '',
        pourcentage: Number(row.pourcentage ?? 0),
        statut: row.statut ?? '',
      };
    });
  },

  // "Reversement du capital restant dû sur une période" = somme des versements de rente
  // effectivement payés (rente_versements, statut PAYEE) dans l'intervalle demandé.
  async capitalRestantDuPeriode(dateDebut: string, dateFin: string): Promise<unknown> {
    const versements = await reportingRepository.findVersementsRentesPeriodeAvecAdherent(dateDebut, dateFin);
    const idsAdherents = Array.from(
      new Set(versements.map((row) => Number(row.rentes?.id_adherent)).filter((id) => !Number.isNaN(id))),
    );
    const adherents = await reportingRepository.findAdherentsParIds(idsAdherents);
    const parAdherent = new Map(adherents.map((row) => [row.id_adherent, row]));
    const parAdherentVersements = groupBy(versements, (row) => Number(row.rentes?.id_adherent));
    const lignes = Array.from(parAdherentVersements.entries())
      .map(([idAdherent, groupe]) => {
        const adherent = parAdherent.get(idAdherent);
        return {
          matricule: adherent?.matricule ?? '',
          nomPrenoms: adherent ? `${adherent.nom ?? ''} ${adherent.prenoms ?? ''}`.trim() : '',
          nombreVersements: groupe.length,
          montantReverse: groupe.reduce((sum, row) => sum + Number(row.montant ?? row.montant_a_payer ?? 0), 0),
        };
      })
      .sort((a, b) => b.montantReverse - a.montantReverse);
    const total = lignes.reduce((sum, row) => sum + row.montantReverse, 0);
    return { dateDebut, dateFin, total, lignes };
  },

  // "Avant la retraite" = adhérent dont le statut retraite est resté false au moment du décès/invalidité.
  async capitalDecesInvaliditeAvantRetraite(): Promise<unknown> {
    const rows = await reportingRepository.findPrestationsParType(['DECES', 'INVALIDITE']);
    const idsAdherents = Array.from(new Set(rows.map((row) => Number(row.id_adherent))));
    const adherents = await reportingRepository.findAdherentsParIds(idsAdherents);
    const parAdherent = new Map(adherents.map((row) => [row.id_adherent, row]));
    const lignes = rows
      .filter((row) => parAdherent.get(Number(row.id_adherent))?.retraite === false)
      .map((row) => ({
        matricule: row.matricule,
        nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
        type: row.type_prestation,
        statut: row.statut_prestation,
        montantDu: Number(row.montant_du ?? 0),
        montantPaye: Number(row.montant_paye ?? 0),
      }));
    const totalDu = lignes.reduce((sum, row) => sum + row.montantDu, 0);
    const totalPaye = lignes.reduce((sum, row) => sum + row.montantPaye, 0);
    return { totalDu, totalPaye, lignes };
  },

  async rachatsResiliations(): Promise<unknown[]> {
    const rows = await reportingRepository.findRachatsResiliations();
    return rows.map((row) => rachatLigne(row));
  },

  // Un dossier avant 2 années complètes de cotisations est une résiliation (pénalité de 5%
  // selon la note technique) ; au-delà, c'est un rachat total.
  async rachats(): Promise<unknown[]> {
    const rows = await reportingRepository.findRachatsResiliations();
    return rows.filter((row) => Number(row.anciennete_annees ?? 0) >= 2).map((row) => rachatLigne(row));
  },

  async resiliations(): Promise<unknown[]> {
    const rows = await reportingRepository.findRachatsResiliations();
    return rows.filter((row) => Number(row.anciennete_annees ?? 0) < 2).map((row) => rachatLigne(row));
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

  async cotisationsPeriode(dateDebut: string, dateFin: string): Promise<unknown> {
    const rows = await reportingRepository.findCotisationsPeriode(dateDebut, dateFin);
    const parMatricule = groupBy(rows, (row) => row.matricule);
    const lignes = Array.from(parMatricule.entries())
      .map(([matricule, groupe]) => ({
        matricule,
        nomPrenoms: `${groupe[0].nom ?? ''} ${groupe[0].prenoms ?? ''}`.trim(),
        nombreMouvements: groupe.length,
        montantEncaisse: groupe.reduce((sum, row) => sum + Number(row.montant ?? 0), 0),
      }))
      .sort((a, b) => b.montantEncaisse - a.montantEncaisse);
    const total = lignes.reduce((sum, row) => sum + row.montantEncaisse, 0);
    return { dateDebut, dateFin, total, lignes };
  },

  async capitalRenteAdherents(): Promise<unknown> {
    const adherents = await reportingRepository.findAdherents('TOUS');
    const lignes = adherents
      .map((row) => ({
        matricule: row.matricule,
        nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
        grade: row.grade ?? '',
        capitalConstitutifRente: Number(row.capital_acquis ?? 0),
      }))
      .sort((a, b) => b.capitalConstitutifRente - a.capitalConstitutifRente);
    const total = lignes.reduce((sum, row) => sum + row.capitalConstitutifRente, 0);
    return { total, lignes };
  },

  async capitalRestantDuRetraites(): Promise<unknown> {
    const rentes = (await reportingRepository.findRentesActives()).filter(
      (row) => row.statut_rente === 'ACTIVE',
    );
    const idsAdherents = rentes.map((row) => Number(row.id_adherent));
    const adherents = await reportingRepository.findAdherentsParIds(idsAdherents);
    const parAdherent = new Map(adherents.map((row) => [row.id_adherent, row]));
    const lignes = rentes
      .map((rente) => {
        const adherent = parAdherent.get(rente.id_adherent);
        return {
          matricule: adherent?.matricule ?? '',
          nomPrenoms: adherent ? `${adherent.nom ?? ''} ${adherent.prenoms ?? ''}`.trim() : '',
          grade: adherent?.grade ?? '',
          capitalInitial: Number(rente.capital_initial ?? 0),
          montantRestantDu: Number(rente.capital_restant ?? 0),
        };
      })
      .sort((a, b) => b.montantRestantDu - a.montantRestantDu);
    const total = lignes.reduce((sum, row) => sum + row.montantRestantDu, 0);
    return { total, lignes };
  },

  async capitalDecesInvalidite(): Promise<unknown> {
    const rows = await reportingRepository.findPrestationsParType(['DECES', 'INVALIDITE']);
    const lignes = rows.map((row) => ({
      matricule: row.matricule,
      nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
      type: row.type_prestation,
      statut: row.statut_prestation,
      montantDu: Number(row.montant_du ?? 0),
      montantPaye: Number(row.montant_paye ?? 0),
    }));
    const totalDu = lignes.reduce((sum, row) => sum + row.montantDu, 0);
    const totalPaye = lignes.reduce((sum, row) => sum + row.montantPaye, 0);
    return { totalDu, totalPaye, lignes };
  },

  async provisionsGlobales(): Promise<unknown> {
    const comptes = await reportingRepository.findComptes();
    const provisionsMathematiques = comptes.reduce((sum, row) => sum + Number(row.pm ?? 0), 0);
    const capitalAcquisTotal = comptes.reduce((sum, row) => sum + Number(row.capital_acquis ?? 0), 0);

    const deces = await reportingRepository.findPrestationsParType(['DECES']);
    const capitalDecesVerse = deces
      .filter((row) => row.statut_prestation === 'PAYE')
      .reduce((sum, row) => sum + Number(row.montant_paye ?? 0), 0);

    const invalidite = await reportingRepository.findPrestationsParType(['INVALIDITE']);
    const capitalInvaliditeVerse = invalidite
      .filter((row) => row.statut_prestation === 'PAYE')
      .reduce((sum, row) => sum + Number(row.montant_paye ?? 0), 0);

    const versements = await reportingRepository.findRenteVersementsPayes();
    const fluxRentesVerses = versements
      .filter((row) => row.statut === 'PAYEE')
      .reduce((sum, row) => sum + Number(row.montant ?? row.montant_a_payer ?? 0), 0);

    return {
      genereLe: new Date().toISOString(),
      provisionsMathematiques,
      capitalAcquisTotal,
      capitalDecesVerse,
      capitalInvaliditeVerse,
      fluxRentesVerses,
      nombreComptes: comptes.length,
    };
  },

  async mouvementsFlux(dateDebut: string, dateFin: string): Promise<unknown> {
    const [cotisations, prestations, rachats, versements] = await Promise.all([
      reportingRepository.findCotisationsPeriode(dateDebut, dateFin),
      reportingRepository.findPrestationsPayeesPeriode(dateDebut, dateFin),
      reportingRepository.findRachatsPeriode(dateDebut, dateFin),
      reportingRepository.findRenteVersementsPayes(dateDebut, dateFin),
    ]);

    const entrees = cotisations.reduce((sum, row) => sum + Number(row.montant ?? 0), 0);
    const sortiesPrestations = prestations.reduce((sum, row) => sum + Number(row.montant_paye ?? 0), 0);
    const sortiesRachats = rachats.reduce((sum, row) => sum + Number(row.montant_net ?? 0), 0);
    const sortiesRentes = versements
      .filter((row) => row.statut === 'PAYEE')
      .reduce((sum, row) => sum + Number(row.montant ?? row.montant_a_payer ?? 0), 0);
    const sorties = sortiesPrestations + sortiesRachats + sortiesRentes;

    const mouvements = [
      ...cotisations.map((row) => ({
        date: row.date_valeur,
        sens: 'ENTREE' as const,
        libelle: `Cotisation ${row.source ?? ''}`.trim(),
        matricule: row.matricule,
        nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
        montant: Number(row.montant ?? 0),
      })),
      ...prestations
        .filter((row) => Number(row.montant_paye ?? 0) > 0)
        .map((row) => ({
          date: row.date_paiement,
          sens: 'SORTIE' as const,
          libelle: `Prestation ${row.type_prestation ?? ''}`.trim(),
          matricule: row.matricule,
          nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
          montant: Number(row.montant_paye ?? 0),
        })),
      ...rachats.map((row) => ({
        date: row.date_paiement,
        sens: 'SORTIE' as const,
        libelle: 'Rachat / résiliation',
        matricule: row.matricule,
        nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
        montant: Number(row.montant_net ?? 0),
      })),
    ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    return { dateDebut, dateFin, entrees, sorties, solde: entrees - sorties, mouvements };
  },

  async avisAnnuelEligibles(): Promise<unknown> {
    const adherents = await reportingRepository.findAdherents('TOUS');
    return adherents
      .map((row) => ({
        idAdherent: String(row.id_adherent),
        matricule: row.matricule,
        nomPrenoms: `${row.nom ?? ''} ${row.prenoms ?? ''}`.trim(),
        grade: row.grade ?? '',
      }))
      .sort((a, b) => a.nomPrenoms.localeCompare(b.nomPrenoms));
  },

  async getCimaC20(annee: number): Promise<unknown> {
    const [cotisations, precomptes, comptes, prestations] = await Promise.all([
      reportingRepository.findCotisationsAnnee(annee),
      reportingRepository.findPrecomptesAnnee(annee),
      reportingRepository.findComptes(),
      reportingRepository.findPrestationsAnnee(annee),
    ]);

    const trimestres = [1, 2, 3, 4].map((trimestre) => {
      const periode = `${annee}T${trimestre}`;
      const rows = cotisations.filter((row) => row.periode === periode);
      const encaissees = rows.filter((row) => row.statut_detail === 'ENCAISSEE');
      const precomptesPeriode = precomptes.filter((row) => row.periode === periode);
      const utiliserPrecomptes = precomptesPeriode.length > 0;
      const precomptesEncaisses = precomptesPeriode.filter((row) => Number(row.montant_retour ?? 0) > 0);
      const adherents = new Set(
        utiliserPrecomptes
          ? precomptesEncaisses.map((row) => String(row.matricule))
          : encaissees.map((row) => String(row.id_adherent)),
      );
      return {
        periode,
        nombreAdherents: adherents.size,
        cotisationsPrevues: utiliserPrecomptes
          ? precomptesPeriode.reduce((sum, row) => sum + Number(row.montant_depart ?? 0), 0)
          : rows.reduce((sum, row) => sum + Number(row.montant ?? 0), 0),
        cotisationsEncaissees: utiliserPrecomptes
          ? precomptesEncaisses.reduce((sum, row) => sum + Number(row.montant_retour ?? 0), 0)
          : encaissees.reduce((sum, row) => sum + Number(row.montant ?? 0), 0),
        nombreMouvements: utiliserPrecomptes ? precomptesEncaisses.length : encaissees.length,
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
