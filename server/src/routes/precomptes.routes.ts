import { Router } from 'express';
import { precomptesController } from '../controllers/precomptes.controller';

export const precomptesRouter = Router();

precomptesRouter.get('/non-precomptes', (req, res, next) => {
  precomptesController.nonPrecomptes(req, res, next);
});

precomptesRouter.post('/retour', (req, res, next) => {
  precomptesController.retour(req, res, next);
});

precomptesRouter.get('/map', (req, res, next) => {
  precomptesController.mapByPeriode(req, res, next);
});

precomptesRouter.post('/generate', (req, res, next) => {
  precomptesController.generate(req, res, next);
});

precomptesRouter.get('/', (req, res, next) => {
  precomptesController.list(req, res, next);
});
