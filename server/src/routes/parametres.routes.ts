import { Router } from 'express';
import { requireRoles } from '../middleware/auth';
import { ReferenceKind } from '../repositories/parametres.repository';
import { parametresController } from '../controllers/parametres.controller';

export const parametresRouter = Router();

const adminOnly = requireRoles('ADMINISTRATEUR');

function referenceRoutes(path: string, kind: ReferenceKind): void {
  parametresRouter.get(path, (req, res, next) => {
    parametresController.reference(kind, req, res, next);
  });

  parametresRouter.post(path, adminOnly, (req, res, next) => {
    parametresController.createReference(kind, req, res, next);
  });

  parametresRouter.put(`${path}/:id`, adminOnly, (req, res, next) => {
    parametresController.updateReference(kind, req, res, next);
  });
}

parametresRouter.get('/generaux/code/:code', (req, res, next) => {
  parametresController.generalByCode(req, res, next);
});

parametresRouter.get('/generaux', (req, res, next) => {
  parametresController.generaux(req, res, next);
});

parametresRouter.put('/generaux/:id', adminOnly, (req, res, next) => {
  parametresController.updateGeneral(req, res, next);
});

parametresRouter.get('/grades', (req, res, next) => {
  parametresController.grades(req, res, next);
});

parametresRouter.post('/grades', adminOnly, (req, res, next) => {
  parametresController.createGrade(req, res, next);
});

parametresRouter.put('/grades/:id', adminOnly, (req, res, next) => {
  parametresController.updateGrade(req, res, next);
});

parametresRouter.get('/versions', (req, res, next) => {
  parametresController.versions(req, res, next);
});

parametresRouter.get('/repartitions/active', (req, res, next) => {
  parametresController.activeRepartition(req, res, next);
});

parametresRouter.get('/repartitions', (req, res, next) => {
  parametresController.repartitions(req, res, next);
});

parametresRouter.post('/repartitions', adminOnly, (req, res, next) => {
  parametresController.createRepartition(req, res, next);
});

parametresRouter.put('/repartitions/:id', adminOnly, (req, res, next) => {
  parametresController.updateRepartition(req, res, next);
});

parametresRouter.get('/mortalite', (req, res, next) => {
  parametresController.mortalite(req, res, next);
});

referenceRoutes('/civilites', 'civilites');
referenceRoutes('/situations-matrimoniales', 'situationsMatrimoniales');
referenceRoutes('/emplois', 'emplois');
referenceRoutes('/liens-beneficiaires', 'liensBeneficiaires');
referenceRoutes('/fonctions', 'fonctions');
