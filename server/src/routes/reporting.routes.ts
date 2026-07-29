import { Router } from 'express';
import { reportingController } from '../controllers/reporting.controller';

export const reportingRouter = Router();

reportingRouter.get('/cima-c20', (req, res, next) => {
  reportingController.cimaC20(req, res, next);
});
