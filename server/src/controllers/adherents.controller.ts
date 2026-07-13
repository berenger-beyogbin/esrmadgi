import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { adherentsService } from '../services/adherents.service';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD');
const idSchema = z.string().trim().min(1, 'ID adherent requis');
const passwordSchema = z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE);

const adherentPayloadSchema = z.object({
  date_souscription: dateSchema,
  matricule: z.string().trim().min(1, 'Matricule requis').max(50),
  civilite: z.string().trim().min(1, 'Civilite requise').max(80),
  nom: z.string().trim().min(1, 'Nom requis').max(120),
  prenoms: z.string().trim().min(1, 'Prenoms requis').max(160),
  date_naissance: dateSchema,
  situation_matrimoniale: z.string().trim().min(1, 'Situation matrimoniale requise').max(120),
  telephone: z.string().trim().min(1, 'Telephone requis').max(80),
  email: z.string().trim().email('Email invalide').max(160),
  emploi: z.string().trim().min(1, 'Emploi requis').max(160),
  statut: z.enum(['ACTIF', 'INACTIF', 'RETRAITE', 'DECEDE']).default('ACTIF'),
  grade_id: z.string().trim().min(1, 'Grade requis'),
  grade: z.string().trim().optional(),
  date_effet: dateSchema,
  date_retraite: dateSchema,
  age_retraite: z.coerce.number().int().positive(),
  cotisation_annuelle: z.coerce.number().min(0),
  date_precompte: z.union([dateSchema, z.literal(''), z.null()]).optional(),
  nb_trimestre: z.coerce.number().int().min(0),
  cotisation_es: z.coerce.number().min(0),
});

const lifecyclePayloadSchema = z.object({
  action: z.enum(['ACTIVER', 'DESACTIVER', 'RETRAITE', 'DECES']),
  motif: z.string().trim().max(500).optional(),
});

const createAccessPayloadSchema = z.object({
  email: z.string().trim().email('Email invalide').max(160).optional(),
  telephone: z.string().trim().max(80).nullable().optional(),
  password: passwordSchema,
});

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

function parseId(raw: unknown): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0]?.message ?? 'ID adherent invalide');
  }
  return parsed.data;
}

export const adherentsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const statut = typeof req.query.statut === 'string' ? req.query.statut : undefined;
      const idAdherent =
        req.user?.role === 'ADHERENT'
          ? (req.user.id_adherent ?? '__NO_ADHERENT_PROFILE__')
          : undefined;

      const { data, error } = await adherentsService.getAll({ search, statut, idAdherent });
      res.json({ data, error });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getById(requireUser(req), parseId(req.params.id));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = adherentPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await adherentsService.create(requireUser(req), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = adherentPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }
      const data = await adherentsService.update(requireUser(req), parseId(req.params.id), parsed.data);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async lifecycle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = lifecyclePayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }

      const data = await adherentsService.changeLifecycle(requireUser(req), parseId(req.params.id), parsed.data);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async createAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createAccessPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
      }

      const data = await adherentsService.createLinkedAccess(requireUser(req), parseId(req.params.id), parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async history(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getHistory(requireUser(req), parseId(req.params.id));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async civilites(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getActiveCivilites();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async situationsMatrimoniales(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getActiveSituationsMatrimoniales();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async emplois(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getActiveEmplois();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async fonctions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getActiveFonctions();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async grades(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adherentsService.getActiveGrades();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
