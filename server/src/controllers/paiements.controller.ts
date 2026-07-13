import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { paiementsService } from '../services/paiements.service';

const createPaiementSchema = z.object({
  adherent_id: z.string().trim().min(1, 'Adherent requis'),
  date_paiement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date paiement invalide'),
  montant_paiement: z.coerce.number().positive('Le montant doit etre superieur a 0'),
  moyen: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES']),
  origine_paiement: z.string().trim().min(1, 'Origine paiement requise').max(240),
  observation_dgi: z.string().trim().max(500).default(''),
  date_valeur: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date valeur invalide'),
});

export const paiementsController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await paiementsService.getPaiements();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createPaiementSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await paiementsService.createPaiement(parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
