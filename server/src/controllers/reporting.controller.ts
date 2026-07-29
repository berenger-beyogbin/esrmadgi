import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { reportingService } from '../services/reporting.service';

export const reportingController = {
  async cimaC20(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const annee = Number(req.query.annee);
      if (!Number.isInteger(annee) || annee < 2020 || annee > 2100) {
        throw new AppError(400, 'Année de reporting invalide');
      }
      const data = await reportingService.getCimaC20(annee);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
