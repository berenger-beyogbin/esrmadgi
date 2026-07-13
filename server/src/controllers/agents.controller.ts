import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { agentsService } from '../services/agents.service';

const searchSchema = z.object({
  matricule: z
    .string({ required_error: 'Le matricule est requis' })
    .min(1, 'Le matricule est requis')
    .max(20, 'Matricule trop long (max 20 caractères)')
    .transform((s) => s.trim().toUpperCase()),
});

export const agentsController = {
  async searchByMatricule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = searchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          found: false,
          data: null,
          error: parsed.error.errors[0]?.message ?? 'Données invalides',
        });
        return;
      }

      const { matricule } = parsed.data;
      const result = await agentsService.searchByMatricule(matricule);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
