import { Router } from 'express';
import { reportingController } from '../controllers/reporting.controller';

export const reportingRouter = Router();

reportingRouter.get('/cima-c20', (req, res, next) => {
  reportingController.cimaC20(req, res, next);
});

reportingRouter.get('/adherents', (req, res, next) => {
  reportingController.listeAdherents(req, res, next);
});

reportingRouter.get('/adherents-actifs', (req, res, next) => {
  reportingController.adherentsActifs(req, res, next);
});

reportingRouter.get('/adherents-retraites', (req, res, next) => {
  reportingController.adherentsRetraites(req, res, next);
});

reportingRouter.get('/adherents-retraites-statut', (req, res, next) => {
  reportingController.adherentsRetraitesParStatut(req, res, next);
});

reportingRouter.get('/rachats-resiliations', (req, res, next) => {
  reportingController.rachatsResiliations(req, res, next);
});

reportingRouter.get('/agents-decedes', (req, res, next) => {
  reportingController.agentsDecedes(req, res, next);
});

reportingRouter.get('/agents-decedes-capital-verse', (req, res, next) => {
  reportingController.agentsDecedesCapitalVerse(req, res, next);
});
