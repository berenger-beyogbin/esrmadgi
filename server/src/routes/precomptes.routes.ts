import { Router } from 'express';
import { precomptesController } from '../controllers/precomptes.controller';

export const precomptesRouter = Router();

precomptesRouter.get('/map', (req, res, next) => {
  precomptesController.mapByPeriode(req, res, next);
});

precomptesRouter.post('/generate', (req, res, next) => {
  precomptesController.generate(req, res, next);
});

precomptesRouter.get('/', (req, res, next) => {
  precomptesController.list(req, res, next);
});
