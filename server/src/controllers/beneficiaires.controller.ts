import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { beneficiairesService } from '../services/beneficiaires.service';

const idSchema = z.coerce.number().int().positive();

const createSchema = z.object({
  id_adherent: z.coerce.number().int().positive(),
  nom_benef: z.string().trim().min(1, 'Le nom est requis').max(120),
  prenoms_benef: z.string().trim().min(1, 'Les prenoms sont requis').max(160),
  lien: z.string().trim().min(1, 'Le lien est requis').max(80),
  pourcentage: z.coerce.number().min(0).max(100),
});

const updateSchema = createSchema.omit({ id_adherent: true });

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

function parseId(raw: unknown, label: string): number {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, `${label} invalide`);
  }
  return parsed.data;
}

export const beneficiairesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const adherentId = parseId(req.query.adherentId, 'ID adherent');
      const data = await beneficiairesService.getByAdherent(user, adherentId);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await beneficiairesService.create(user, parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = parseId(req.params.id, 'ID beneficiaire');
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await beneficiairesService.update(user, id, parsed.data);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = requireUser(req);
      const id = parseId(req.params.id, 'ID beneficiaire');
      await beneficiairesService.delete(user, id);
      res.json({ data: null, error: null });
    } catch (err) {
      next(err);
    }
  },

  async liens(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await beneficiairesService.getLiens();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
