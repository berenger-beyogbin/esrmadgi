import { Router } from 'express';
import { comptesEsrController } from '../controllers/comptes-esr.controller';

export const comptesEsrRouter = Router();

comptesEsrRouter.get('/adherent/:adherentId/avis-annuel.pdf', (req, res, next) => {
  comptesEsrController.avisAnnuel(req, res, next);
});

comptesEsrRouter.post('/adherent/:adherentId/recalculer', (req, res, next) => {
  comptesEsrController.recalculer(req, res, next);
});

comptesEsrRouter.get('/adherent/:adherentId', (req, res, next) => {
  comptesEsrController.byAdherent(req, res, next);
});

comptesEsrRouter.get('/', (req, res, next) => {
  comptesEsrController.list(req, res, next);
});
