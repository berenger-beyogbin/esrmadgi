import { Router } from 'express';
import { adhesionsEnLigneController } from '../controllers/adhesions-en-ligne.controller';
import { requireAuth, requireRoles } from '../middleware/auth';
import {
  publicAgentSearchRateLimiter,
  publicReadRateLimiter,
  publicSubmissionRateLimiter,
} from '../middleware/rateLimit';

export const adhesionsEnLigneRouter = Router();

adhesionsEnLigneRouter.get('/referentiels', publicReadRateLimiter, (req, res, next) => {
  adhesionsEnLigneController.referentiels(req, res, next);
});

adhesionsEnLigneRouter.post('/search-agent', publicAgentSearchRateLimiter, (req, res, next) => {
  adhesionsEnLigneController.searchAgent(req, res, next);
});

adhesionsEnLigneRouter.post('/', publicSubmissionRateLimiter, (req, res, next) => {
  adhesionsEnLigneController.submit(req, res, next);
});

adhesionsEnLigneRouter.use(requireAuth, requireRoles('GESTIONNAIRE', 'ADMINISTRATEUR'));

adhesionsEnLigneRouter.get('/', (req, res, next) => {
  adhesionsEnLigneController.list(req, res, next);
});

adhesionsEnLigneRouter.get('/:id', (req, res, next) => {
  adhesionsEnLigneController.detail(req, res, next);
});

adhesionsEnLigneRouter.put('/:id', (req, res, next) => {
  adhesionsEnLigneController.update(req, res, next);
});

adhesionsEnLigneRouter.post('/:id/validate', (req, res, next) => {
  adhesionsEnLigneController.validate(req, res, next);
});

adhesionsEnLigneRouter.post('/:id/reject', (req, res, next) => {
  adhesionsEnLigneController.reject(req, res, next);
});
