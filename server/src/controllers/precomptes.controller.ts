import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { cotisationsService } from '../services/cotisations.service';
import { precomptesService } from '../services/precomptes.service';
import { AuthenticatedUser } from '../types';

const generateSchema = z.object({
  periode: z.string().trim().regex(/^\d{4}T[1-4]$/i, 'Format de periode invalide. Attendu : 2026T2'),
});

const retourSchema = z.object({
  periode: z.string().trim().regex(/^\d{4}T[1-4]$/i, 'Format de periode invalide'),
  dateRetour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date retour invalide'),
  lignes: z.array(z.object({
    matricule: z.string().trim().min(1),
    montantRetour: z.coerce.number().min(0),
    dateRetour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    motif: z.string().trim().max(500).optional(),
  })).min(1),
});

const idSchema = z.coerce.number().int().positive();

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new AppError(401, 'Authentification requise');
  return req.user;
}

export const precomptesController = {
  async nonPrecomptes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const periode = typeof req.query.periode === 'string' ? req.query.periode : undefined;
      const data = await precomptesService.getNonPrecomptes(periode);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await precomptesService.getPrecomptes({ search });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async mapByPeriode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const periode = typeof req.query.periode === 'string' ? req.query.periode : '';
      const data = await precomptesService.getPrecomptesMapByPeriode(periode);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = generateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const result = await cotisationsService.generatePrecomptes(parsed.data.periode.toUpperCase());
      res.json({ result, error: null });
    } catch (err) {
      next(err);
    }
  },

  async retour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = retourSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Retour DGI invalide');
      }
      const result = await precomptesService.enregistrerRetour(requireUser(req), parsed.data);
      res.json({ result, error: null });
    } catch (err) {
      next(err);
    }
  },

  async reporter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedId = idSchema.safeParse(req.params.id);
      if (!parsedId.success) {
        throw new AppError(400, 'ID précompte invalide');
      }
      await precomptesService.reporterPrecompte(requireUser(req), parsedId.data);
      res.json({ data: { id_precompte: parsedId.data }, error: null });
    } catch (err) {
      next(err);
    }
  },
};
