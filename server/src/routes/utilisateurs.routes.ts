import { Router } from 'express';
import { utilisateursController } from '../controllers/utilisateurs.controller';

export const utilisateursRouter = Router();

utilisateursRouter.get('/', (req, res, next) => {
  utilisateursController.list(req, res, next);
});

utilisateursRouter.post('/', (req, res, next) => {
  utilisateursController.create(req, res, next);
});

utilisateursRouter.put('/:id', (req, res, next) => {
  utilisateursController.update(req, res, next);
});
