import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { prestationsService } from '../services/prestations.service';
import { AuthenticatedUser } from '../types';

const createPrestationSchema = z.object({
  adherent_id: z.string().trim().min(1, 'Adherent requis'),
  type_prestation: z.enum(['RETRAITE', 'DECES', 'INVALIDITE']),
  statut_prestation: z
    .enum(['DOSSIER_OUVERT', 'EN_CONTROLE', 'VALIDE', 'PAYE', 'ANNULE'])
    .default('DOSSIER_OUVERT'),
  date_demande: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD'),
  montant: z.coerce.number().min(0).optional(),
});

const calculBaseSchema = z.object({
  dateCalcul: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date de calcul invalide'),
  adherentId: z.string().trim().min(1).optional(),
});

const calculPrestationSchema = z.discriminatedUnion('typeCalcul', [
  calculBaseSchema.extend({
    typeCalcul: z.literal('COTISATION_UNIQUE'),
    renteAnnuelle: z.coerce.number().positive(),
    ageRetraite: z.coerce.number().int().min(18).max(105),
    nombreTrimestresAvantRetraite: z.coerce.number().int().min(0),
  }),
  calculBaseSchema.extend({
    typeCalcul: z.literal('PROVISION'),
    cotisationTrimestrielle: z.coerce.number().min(0),
    nombreTrimestresCourus: z.coerce.number().int().min(0),
  }),
  calculBaseSchema.extend({
    typeCalcul: z.literal('RACHAT'),
    cotisationTrimestrielle: z.coerce.number().min(0),
    nombreTrimestresCourus: z.coerce.number().int().min(0),
    ancienneteAnnees: z.coerce.number().min(0),
  }),
  calculBaseSchema.extend({
    typeCalcul: z.enum(['DECES_AVANT_RETRAITE', 'INVALIDITE_AVANT_RETRAITE']),
    cotisationTrimestrielle: z.coerce.number().min(0),
    nombreTrimestresCourus: z.coerce.number().int().min(0),
  }),
  calculBaseSchema.extend({
    typeCalcul: z.literal('DECES_PENDANT_RENTE'),
    capitalRestantDu: z.coerce.number().min(0),
  }),
]);

const statutPrestationSchema = z.object({
  statut: z.enum(['EN_CONTROLE', 'VALIDE', 'PAYE', 'ANNULE']),
  observation: z.string().trim().max(500).default(''),
});

const genererEcheancesSchema = z.object({
  annee: z.coerce.number().int().min(2000).max(2200),
  trimestre: z.coerce.number().int().min(1).max(4),
});

const statutEcheanceSchema = z.object({
  statut: z.enum(['EN_CONTROLE', 'VALIDEE', 'REJETEE', 'SUSPENDUE', 'ANNULEE']),
  observation: z.string().trim().max(500).default(''),
});

const paiementEcheanceSchema = z.object({
  datePaiement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referencePaiement: z.string().trim().min(1).max(100),
  modePaiement: z.enum(['VIREMENT', 'CHEQUE']),
  pieceJustificative: z.string().trim().max(500).optional(),
});

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) throw new AppError(401, 'Authentification requise');
  return req.user;
}

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
      const data = await prestationsService.createPrestation(requireUser(req), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async calculer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = calculPrestationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees de calcul invalides');
      }
      const data = await prestationsService.calculerPrestation(requireUser(req), parsed.data);
      res.json({ data, error: null });
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

  async echeances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        annee: req.query.annee ? Number(req.query.annee) : undefined,
        trimestre: req.query.trimestre ? Number(req.query.trimestre) : undefined,
        statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
      };
      const data = await prestationsService.getEcheances(filters);
      res.json({ data, error: null });
    } catch (err) { next(err); }
  },

  async genererEcheances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = genererEcheancesSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Periode invalide');
      const data = await prestationsService.genererEcheances(requireUser(req), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) { next(err); }
  },

  async changerStatutEcheance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = statutEcheanceSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Statut invalide');
      const data = await prestationsService.changerStatutEcheance(
        requireUser(req), String(req.params.id), parsed.data.statut, parsed.data.observation,
      );
      res.json({ data, error: null });
    } catch (err) { next(err); }
  },

  async payerEcheance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = paiementEcheanceSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Paiement invalide');
      const data = await prestationsService.payerEcheance(requireUser(req), String(req.params.id), parsed.data);
      res.json({ data, error: null });
    } catch (err) { next(err); }
  },

  async liquidation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) throw new AppError(400, 'ID prestation requis');
      const pdf = await prestationsService.genererLiquidation(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="liquidation-${id}.pdf"`);
      res.send(Buffer.from(pdf));
    } catch (err) {
      next(err);
    }
  },

  async changerStatut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) throw new AppError(400, 'ID prestation requis');
      const parsed = statutPrestationSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Statut invalide');
      const data = await prestationsService.changerStatut(
        requireUser(req),
        id,
        parsed.data.statut,
        parsed.data.observation,
      );
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
