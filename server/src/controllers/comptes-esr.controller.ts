import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { comptesEsrService } from '../services/comptes-esr.service';

const idSchema = z.string().trim().min(1);

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

export const comptesEsrController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await comptesEsrService.getComptes(requireUser(req), {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async byAdherent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = idSchema.safeParse(req.params.adherentId);
      if (!parsed.success) {
        throw new AppError(400, 'ID adherent invalide');
      }
      const data = await comptesEsrService.getCompteByAdherentId(requireUser(req), parsed.data);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
