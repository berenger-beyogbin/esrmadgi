import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { comptesEsrService } from '../services/comptes-esr.service';

const idSchema = z.string().trim().min(1);
const recalculSchema = z.object({
  dateCalcul: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de calcul invalide'),
});

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

  async recalculer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedId = idSchema.safeParse(req.params.adherentId);
      const parsedBody = recalculSchema.safeParse(req.body);
      if (!parsedId.success) throw new AppError(400, 'ID adherent invalide');
      if (!parsedBody.success) {
        throw new AppError(400, parsedBody.error.errors[0]?.message ?? 'Date de calcul invalide');
      }
      const data = await comptesEsrService.recalculerCompte(
        requireUser(req),
        parsedId.data,
        parsedBody.data.dateCalcul,
      );
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async avisAnnuel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsedId = idSchema.safeParse(req.params.adherentId);
      const annee = Number(req.query.annee);
      if (!parsedId.success) throw new AppError(400, 'ID adherent invalide');
      if (!Number.isInteger(annee) || annee < 2020 || annee > 2100) {
        throw new AppError(400, 'Annee invalide');
      }
      const pdf = await comptesEsrService.genererAvisAnnuel(requireUser(req), parsedId.data, annee);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="avis-annuel-esr-${annee}.pdf"`);
      res.send(Buffer.from(pdf));
    } catch (err) {
      next(err);
    }
  },
};
