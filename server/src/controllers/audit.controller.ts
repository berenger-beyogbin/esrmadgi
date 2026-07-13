import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { auditService } from '../services/audit.service';

const auditEventSchema = z.object({
  action: z.string().trim().min(1, 'Action requise'),
  objetAudit: z.string().trim().min(1, 'Objet audit requis'),
  idObjet: z.union([z.string().trim(), z.number()]).nullable().optional(),
  details: z.string().trim().default(''),
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await auditService.getLogs({
        action: typeof req.query.action === 'string' ? req.query.action : undefined,
        utilisateur: typeof req.query.utilisateur === 'string' ? req.query.utilisateur : undefined,
        objetAudit: typeof req.query.objetAudit === 'string' ? req.query.objetAudit : undefined,
        idObjet: typeof req.query.idObjet === 'string' ? req.query.idObjet : undefined,
        date: typeof req.query.date === 'string' ? req.query.date : undefined,
      });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = auditEventSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await auditService.logEvent(requireUser(req), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
