import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { cotisationsService } from '../services/cotisations.service';

const idSchema = z.coerce.number().int().positive();

const cotisationSpontaneeSchema = z.object({
  id_adherent: z.coerce.number().int().positive(),
  mode: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD'),
  montant: z.coerce.number().positive('Le montant doit etre superieur a 0'),
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

function parsePositiveId(raw: unknown, label: string): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, `${label} invalide`);
  }
  return String(parsed.data);
}

export const cotisationsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const filters = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        periode: typeof req.query.periode === 'string' ? req.query.periode : undefined,
        statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        dateDebut: typeof req.query.dateDebut === 'string' ? req.query.dateDebut : undefined,
        dateFin: typeof req.query.dateFin === 'string' ? req.query.dateFin : undefined,
      };
      const data = await cotisationsService.getCotisations(user, filters);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async byAdherent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const idAdherent = parsePositiveId(req.params.idAdherent, 'ID adherent');
      const data = await cotisationsService.getCotisationsByAdherentId(user, idAdherent);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async byMatricule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const matricule = String(req.params.matricule ?? '').trim().toUpperCase();
      if (!matricule) {
        throw new AppError(400, 'Matricule requis');
      }
      const data = await cotisationsService.getCotisationsByMatricule(user, matricule);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async adherentsPourCotisation(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await cotisationsService.getAdherentsPourCotisation();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async infoCotisation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const idAdherent = parsePositiveId(req.params.idAdherent, 'ID adherent');
      const data = await cotisationsService.getInfoCotisationActive(user, idAdherent);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async createSpontanee(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = cotisationSpontaneeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await cotisationsService.createCotisationSpontanee(parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
