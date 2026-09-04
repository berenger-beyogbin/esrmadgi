import { Router } from 'express';
import { cotisationsController } from '../controllers/cotisations.controller';
import { requireRoles } from '../middleware/auth';

export const cotisationsRouter = Router();

cotisationsRouter.get('/adherents-actifs', requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), (req, res, next) => {
  cotisationsController.adherentsPourCotisation(req, res, next);
});

cotisationsRouter.get('/info/:idAdherent', (req, res, next) => {
  cotisationsController.infoCotisation(req, res, next);
});

cotisationsRouter.get('/adherent/:idAdherent', (req, res, next) => {
  cotisationsController.byAdherent(req, res, next);
});

cotisationsRouter.get('/matricule/:matricule', (req, res, next) => {
  cotisationsController.byMatricule(req, res, next);
});

cotisationsRouter.post('/spontanee/simulation', requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), (req, res, next) => {
  cotisationsController.simulateSpontanee(req, res, next);
});

cotisationsRouter.post('/spontanee', requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'), (req, res, next) => {
  cotisationsController.createSpontanee(req, res, next);
});

cotisationsRouter.get('/', (req, res, next) => {
  cotisationsController.list(req, res, next);
});
