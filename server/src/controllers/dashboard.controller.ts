import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { dashboardService } from '../services/dashboard.service';
import { assertPeriode } from '../utils/periode';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

export const dashboardController = {
  async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const periode = typeof req.query.periode === 'string'
        ? assertPeriode(req.query.periode)
        : undefined;
      const data = await dashboardService.getStats(requireUser(req), periode);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
