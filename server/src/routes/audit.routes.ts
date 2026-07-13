import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';

export const auditRouter = Router();

auditRouter.post('/', (req, res, next) => {
  auditController.create(req, res, next);
});

auditRouter.get('/', (req, res, next) => {
  auditController.list(req, res, next);
});
