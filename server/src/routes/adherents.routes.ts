import { Router } from 'express';
import { requireRoles } from '../middleware/auth';
import { adherentsController } from '../controllers/adherents.controller';

export const adherentsRouter = Router();

const canManageAdherents = requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR');

adherentsRouter.get('/referentiels/civilites', canManageAdherents, (req, res, next) => {
  adherentsController.civilites(req, res, next);
});

adherentsRouter.get('/referentiels/situations-matrimoniales', canManageAdherents, (req, res, next) => {
  adherentsController.situationsMatrimoniales(req, res, next);
});

adherentsRouter.get('/referentiels/emplois', canManageAdherents, (req, res, next) => {
  adherentsController.emplois(req, res, next);
});

adherentsRouter.get('/referentiels/fonctions', canManageAdherents, (req, res, next) => {
  adherentsController.fonctions(req, res, next);
});

adherentsRouter.get('/referentiels/grades', canManageAdherents, (req, res, next) => {
  adherentsController.grades(req, res, next);
});

adherentsRouter.get('/filters/options', (req, res, next) => {
  adherentsController.filterOptions(req, res, next);
});

adherentsRouter.get('/promo-retraite/eligibles', canManageAdherents, (req, res, next) => {
  adherentsController.promoRetraiteEligibles(req, res, next);
});

adherentsRouter.post('/promo-retraite/appliquer', canManageAdherents, (req, res, next) => {
  adherentsController.promoRetraiteAppliquer(req, res, next);
});

adherentsRouter.post('/', canManageAdherents, (req, res, next) => {
  adherentsController.create(req, res, next);
});

adherentsRouter.get('/', (req, res, next) => {
  adherentsController.list(req, res, next);
});

adherentsRouter.get('/:id/history', (req, res, next) => {
  adherentsController.history(req, res, next);
});

adherentsRouter.post('/:id/lifecycle', canManageAdherents, (req, res, next) => {
  adherentsController.lifecycle(req, res, next);
});

adherentsRouter.post('/:id/access', canManageAdherents, (req, res, next) => {
  adherentsController.createAccess(req, res, next);
});

adherentsRouter.get('/:id', (req, res, next) => {
  adherentsController.detail(req, res, next);
});

adherentsRouter.put('/:id', canManageAdherents, (req, res, next) => {
  adherentsController.update(req, res, next);
});
