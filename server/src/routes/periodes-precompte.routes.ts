import { Router } from 'express';
import { periodesController } from '../controllers/periodes-precompte.controller';
import { requireRoles } from '../middleware/auth';

export const periodesRouter = Router();

periodesRouter.get('/', (req, res, next) => {
  periodesController.list(req, res, next);
});

periodesRouter.post('/', requireRoles('ADMINISTRATEUR'), (req, res, next) => {
  periodesController.create(req, res, next);
});

periodesRouter.get('/:periode/cloture-controles', (req, res, next) => {
  periodesController.controlesCloture(req, res, next);
});

periodesRouter.post('/:periode/cloturer', requireRoles('ADMINISTRATEUR'), (req, res, next) => {
  periodesController.cloturer(req, res, next);
});
