import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { dashboardService } from '../services/dashboard.service';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

export const dashboardController = {
  async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getStats(requireUser(req));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
