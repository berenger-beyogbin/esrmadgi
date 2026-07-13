import { Router } from 'express';
import { comptesEsrController } from '../controllers/comptes-esr.controller';

export const comptesEsrRouter = Router();

comptesEsrRouter.get('/adherent/:adherentId', (req, res, next) => {
  comptesEsrController.byAdherent(req, res, next);
});

comptesEsrRouter.get('/', (req, res, next) => {
  comptesEsrController.list(req, res, next);
});
