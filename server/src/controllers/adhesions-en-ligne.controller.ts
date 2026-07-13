import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { adhesionsEnLigneService } from '../services/adhesions-en-ligne.service';
import { turnstileService } from '../services/turnstile.service';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD');

const idSchema = z.string().trim().min(1, 'ID demande requis');

const searchSchema = z.object({
  matricule: z
    .string()
    .trim()
    .min(2, 'Matricule trop court')
    .max(20, 'Matricule trop long')
    .regex(/^[a-zA-Z0-9._/-]+$/, 'Matricule invalide')
    .transform((value) => value.toUpperCase()),
  captchaToken: z.string().trim().max(4096).optional(),
});

const nullableEmailSchema = z
  .union([z.string().trim().email('Email invalide').max(160), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const onlineAdhesionPayloadSchema = z.object({
  date_souscription: dateSchema,
  matricule: z.string().trim().min(1, 'Matricule requis').max(50).transform((value) => value.toUpperCase()),
  civilite: z.string().trim().min(1, 'Civilite requise').max(80),
  sexe: z.string().trim().max(10).nullable().optional(),
  nom: z.string().trim().min(1, 'Nom requis').max(120),
  prenoms: z.string().trim().min(1, 'Prenoms requis').max(160),
  date_naissance: dateSchema,
  situation_matrimoniale: z.string().trim().min(1, 'Situation matrimoniale requise').max(120),
  telephone: z.string().trim().min(1, 'Telephone requis').max(80),
  email: nullableEmailSchema,
  emploi: z.string().trim().min(1, 'Emploi requis').max(220),
  grade_id: z.string().trim().min(1, 'Grade requis'),
  grade: z.string().trim().optional(),
  date_effet: dateSchema,
  date_retraite: dateSchema,
  age_retraite: z.coerce.number().int().positive(),
  cotisation_annuelle: z.coerce.number().min(0),
  date_precompte: z.union([dateSchema, z.literal(''), z.null()]).optional(),
  nb_trimestre: z.coerce.number().int().min(0),
  cotisation_es: z.coerce.number().min(0),
  taux_gar: z.coerce.number().nullable().optional(),
  frais_rente: z.coerce.number().nullable().optional(),
  taux_rachat: z.coerce.number().nullable().optional(),
});

const rejectSchema = z.object({
  motif: z.string().trim().max(500).optional(),
});

function requireUser(req: Request) {
  if (!req.user) throw new AppError(401, 'Authentification requise');
  return req.user;
}

function parseId(raw: unknown): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'ID demande invalide');
  return parsed.data;
}

function parsePayload(body: unknown) {
  const parsed = onlineAdhesionPayloadSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
  return parsed.data;
}

export const adhesionsEnLigneController = {
  async referentiels(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adhesionsEnLigneService.getPublicReferentiels();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async searchAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = searchSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      await turnstileService.verify(parsed.data.captchaToken, req.ip);
      const result = await adhesionsEnLigneService.searchAgent(parsed.data.matricule);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adhesionsEnLigneService.submitPublic(parsePayload(req.body));
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const data = await adhesionsEnLigneService.list({ search, statut: 'EN_ATTENTE' });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adhesionsEnLigneService.getById(parseId(req.params.id));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adhesionsEnLigneService.update(requireUser(req), parseId(req.params.id), parsePayload(req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adhesionsEnLigneService.validate(requireUser(req), parseId(req.params.id), parsePayload(req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = rejectSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      const data = await adhesionsEnLigneService.reject(requireUser(req), parseId(req.params.id), parsed.data.motif);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
