import { Router } from 'express';
import { paiementsController } from '../controllers/paiements.controller';

export const paiementsRouter = Router();

paiementsRouter.get('/:id/recu.pdf', (req, res, next) => {
  paiementsController.recu(req, res, next);
});

paiementsRouter.put('/:id/statut', (req, res, next) => {
  paiementsController.changerStatut(req, res, next);
});

paiementsRouter.post('/', (req, res, next) => {
  paiementsController.create(req, res, next);
});

paiementsRouter.get('/', (req, res, next) => {
  paiementsController.list(req, res, next);
});
