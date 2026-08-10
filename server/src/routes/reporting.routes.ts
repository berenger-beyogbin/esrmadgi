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

reportingRouter.get('/cotisations-periode', (req, res, next) => {
  reportingController.cotisationsPeriode(req, res, next);
});

reportingRouter.get('/capital-rente-adherents', (req, res, next) => {
  reportingController.capitalRenteAdherents(req, res, next);
});

reportingRouter.get('/capital-restant-du-retraites', (req, res, next) => {
  reportingController.capitalRestantDuRetraites(req, res, next);
});

reportingRouter.get('/capital-deces-invalidite', (req, res, next) => {
  reportingController.capitalDecesInvalidite(req, res, next);
});

reportingRouter.get('/provisions-globales', (req, res, next) => {
  reportingController.provisionsGlobales(req, res, next);
});

reportingRouter.get('/mouvements-flux', (req, res, next) => {
  reportingController.mouvementsFlux(req, res, next);
});

reportingRouter.get('/avis-annuel-eligibles', (req, res, next) => {
  reportingController.avisAnnuelEligibles(req, res, next);
});

reportingRouter.get('/rachats', (req, res, next) => {
  reportingController.rachats(req, res, next);
});

reportingRouter.get('/resiliations', (req, res, next) => {
  reportingController.resiliations(req, res, next);
});

reportingRouter.get('/retraites-a-jour', (req, res, next) => {
  reportingController.retraitesAJour(req, res, next);
});

reportingRouter.get('/retraites-non-a-jour', (req, res, next) => {
  reportingController.retraitesNonAJour(req, res, next);
});

reportingRouter.get('/actifs-a-jour', (req, res, next) => {
  reportingController.actifsAJour(req, res, next);
});

reportingRouter.get('/actifs-non-a-jour', (req, res, next) => {
  reportingController.actifsNonAJour(req, res, next);
});

reportingRouter.get('/ayants-droit', (req, res, next) => {
  reportingController.ayantsDroitGlobal(req, res, next);
});

reportingRouter.get('/capital-restant-du-periode', (req, res, next) => {
  reportingController.capitalRestantDuPeriode(req, res, next);
});

reportingRouter.get('/capital-deces-invalidite-avant-retraite', (req, res, next) => {
  reportingController.capitalDecesInvaliditeAvantRetraite(req, res, next);
});
