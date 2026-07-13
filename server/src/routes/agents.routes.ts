import { Router } from 'express';
import { agentsController } from '../controllers/agents.controller';

export const agentsRouter = Router();

agentsRouter.post('/search-by-matricule', (req, res, next) => {
  agentsController.searchByMatricule(req, res, next);
});
