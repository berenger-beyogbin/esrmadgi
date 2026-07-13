import { Router } from 'express';
import { paiementsController } from '../controllers/paiements.controller';

export const paiementsRouter = Router();

paiementsRouter.post('/', (req, res, next) => {
  paiementsController.create(req, res, next);
});

paiementsRouter.get('/', (req, res, next) => {
  paiementsController.list(req, res, next);
});
