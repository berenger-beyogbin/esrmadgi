import { Router } from 'express';
import { beneficiairesController } from '../controllers/beneficiaires.controller';

export const beneficiairesRouter = Router();

beneficiairesRouter.get('/liens', (req, res, next) => {
  beneficiairesController.liens(req, res, next);
});

beneficiairesRouter.get('/', (req, res, next) => {
  beneficiairesController.list(req, res, next);
});

beneficiairesRouter.post('/', (req, res, next) => {
  beneficiairesController.create(req, res, next);
});

beneficiairesRouter.put('/:id', (req, res, next) => {
  beneficiairesController.update(req, res, next);
});

beneficiairesRouter.delete('/:id', (req, res, next) => {
  beneficiairesController.delete(req, res, next);
});
