import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { periodesService } from '../services/periodes-precompte.service';
import { AuthenticatedUser } from '../types';

const periodeParamsSchema = z.object({
  periode: z.string().trim().regex(/^\d{4}T[1-4]$/i, 'Format de periode invalide. Attendu : 2026T2'),
});

const createPeriodeSchema = z.object({
  annee: z.coerce.number().int().min(2000).max(2100),
  trimestre: z.coerce.number().int().min(1).max(4),
});

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new AppError(401, 'Authentification requise');
  return req.user;
}

export const periodesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await periodesService.getPeriodes();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPeriodeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Periode invalide');
      }
      const data = await periodesService.creerPeriode(
        requireUser(req),
        parsed.data.annee,
        parsed.data.trimestre,
      );
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async controlesCloture(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = periodeParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Periode invalide');
      }
      const data = await periodesService.getControleCloture(parsed.data.periode);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async cloturer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = periodeParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Periode invalide');
      }
      const data = await periodesService.cloturerPeriode(requireUser(req), parsed.data.periode);
      res.json({ data: { periode: parsed.data.periode.toUpperCase(), ...data }, error: null });
    } catch (err) {
      next(err);
    }
  },
};
