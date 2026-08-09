import { Router } from 'express';
import { prestationsController } from '../controllers/prestations.controller';

export const prestationsRouter = Router();

prestationsRouter.patch('/echeances/:id/paiement', (req, res, next) => {
  prestationsController.payerEcheance(req, res, next);
});

prestationsRouter.patch('/echeances/:id/statut', (req, res, next) => {
  prestationsController.changerStatutEcheance(req, res, next);
});

prestationsRouter.post('/echeances/generer', (req, res, next) => {
  prestationsController.genererEcheances(req, res, next);
});

prestationsRouter.get('/echeances', (req, res, next) => {
  prestationsController.echeances(req, res, next);
});

prestationsRouter.patch('/:id/statut', (req, res, next) => {
  prestationsController.changerStatut(req, res, next);
});

prestationsRouter.get('/:id/liquidation.pdf', (req, res, next) => {
  prestationsController.liquidation(req, res, next);
});

prestationsRouter.post('/calculs', (req, res, next) => {
  prestationsController.calculer(req, res, next);
});

prestationsRouter.get('/rentes/:renteId/versements', (req, res, next) => {
  prestationsController.renteVersements(req, res, next);
});

prestationsRouter.get('/rentes', (req, res, next) => {
  prestationsController.rentes(req, res, next);
});

prestationsRouter.post('/', (req, res, next) => {
  prestationsController.create(req, res, next);
});

prestationsRouter.get('/', (req, res, next) => {
  prestationsController.list(req, res, next);
});
