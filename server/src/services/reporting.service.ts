import { reportingRepository } from '../repositories/reporting.repository';

export const reportingService = {
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
