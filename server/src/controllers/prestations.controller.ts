import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { prestationsService } from '../services/prestations.service';

const createPrestationSchema = z.object({
  adherent_id: z.string().trim().min(1, 'Adherent requis'),
  type_prestation: z.enum(['RETRAITE', 'DECES', 'INVALIDITE', 'RACHAT']),
  statut_prestation: z
    .enum(['DOSSIER_OUVERT', 'EN_CONTROLE', 'VALIDE', 'PAYE', 'ANNULE'])
    .default('DOSSIER_OUVERT'),
  date_demande: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD'),
  montant: z.coerce.number().min(0),
});

export const prestationsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        type: typeof req.query.type === 'string' ? req.query.type : undefined,
        statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
      };
      const data = await prestationsService.getPrestations(filters);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPrestationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await prestationsService.createPrestation(parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async rentes(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await prestationsService.getRentes();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async renteVersements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const renteId = String(req.params.renteId ?? '').trim();
      if (!renteId) {
        throw new AppError(400, 'ID rente requis');
      }
      const data = await prestationsService.getRenteVersements(renteId);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
