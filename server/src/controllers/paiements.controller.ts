import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { paiementsService } from '../services/paiements.service';
import { AuthenticatedUser } from '../types';

const createPaiementSchema = z.object({
  adherent_id: z.string().trim().min(1, 'Adherent requis'),
  date_paiement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date paiement invalide'),
  montant_paiement: z.coerce.number().positive('Le montant doit etre superieur a 0'),
  moyen: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES']),
  origine_paiement: z.string().trim().min(1, 'Origine paiement requise').max(240),
  observation_dgi: z.string().trim().max(500).default(''),
  date_valeur: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date valeur invalide'),
});

const workflowSchema = z.object({
  statut: z.enum(['CONTROLE', 'DEPOSE_BANQUE', 'COMPENSE', 'VALIDE', 'REJETE', 'REJETE_BANQUE', 'ENCAISSE']),
  observation: z.string().trim().max(500).default(''),
  reference_bordereau: z.string().trim().max(120).optional(),
  date_depot_banque: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reference_avis_credit: z.string().trim().max(120).optional(),
  date_compensation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  motif_rejet: z.string().trim().max(500).optional(),
});

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new AppError(401, 'Authentification requise');
  return req.user;
}

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
      const data = await paiementsService.createPaiement(requireUser(req), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async changerStatut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) throw new AppError(400, 'ID paiement requis');
      const parsed = workflowSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Transition invalide');
      }
      const data = await paiementsService.changerStatut(
        requireUser(req),
        id,
        parsed.data.statut,
        parsed.data.observation,
        parsed.data,
      );
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async recu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) throw new AppError(400, 'ID paiement requis');
      const pdf = await paiementsService.genererRecu(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="recu-paiement-${id}.pdf"`);
      res.send(Buffer.from(pdf));
    } catch (err) {
      next(err);
    }
  },
};
