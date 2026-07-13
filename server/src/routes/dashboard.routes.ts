import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/', (req, res, next) => {
  dashboardController.stats(req, res, next);
});
