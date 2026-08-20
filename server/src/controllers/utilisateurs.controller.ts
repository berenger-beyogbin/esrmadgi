import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { utilisateursService } from '../services/utilisateurs.service';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

const roleSchema = z.string().trim().min(2).max(40).transform((value) => value.toUpperCase());
const idSchema = z.coerce.number().int().positive('ID utilisateur invalide');
const nullableNumberSchema = z.union([z.coerce.number().int().positive(), z.null()]).optional();
const passwordSchema = z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE);

const createUtilisateurSchema = z.object({
  matricule: z.string().trim().min(1, 'Matricule requis').max(50),
  email: z.string().trim().email('Email invalide').max(160),
  password: passwordSchema,
  profil: roleSchema,
  telephone: z.string().trim().max(80).nullable().optional(),
  user_actif: z.boolean().optional(),
  id_adherent: nullableNumberSchema,
});

const updateUtilisateurSchema = z.object({
  email: z.string().trim().email('Email invalide').max(160).optional(),
  password: z.union([passwordSchema, z.literal('')]).optional(),
  profil: roleSchema.optional(),
  telephone: z.string().trim().max(80).nullable().optional(),
  user_actif: z.boolean().optional(),
  id_adherent: nullableNumberSchema,
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

function parseId(raw: unknown): number {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0]?.message ?? 'ID utilisateur invalide');
  }
  return parsed.data;
}

export const utilisateursController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const profil = typeof req.query.profil === 'string' ? req.query.profil : undefined;
      const actif = typeof req.query.actif === 'string' ? req.query.actif : undefined;
      const data = await utilisateursService.getAll({ search, profil, actif });
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createUtilisateurSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }

      const data = await utilisateursService.create(requireUser(req), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updateUtilisateurSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }

      const payload = {
        ...parsed.data,
        password: parsed.data.password || undefined,
      };
      const data = await utilisateursService.update(requireUser(req), parseId(req.params.id), payload);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
