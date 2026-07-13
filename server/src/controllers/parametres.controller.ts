import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { ReferenceKind } from '../repositories/parametres.repository';
import { parametresService } from '../services/parametres.service';

const idSchema = z.coerce.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD');
const optionalDateSchema = z.union([dateSchema, z.null()]).optional();
const primitiveValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]).optional();

const gradeSchema = z.object({
  libelle_grade: z.string().trim().min(1, 'Libelle grade requis'),
  age_retraite: z.coerce.number().int().positive(),
  cotisation_annuelle: z.coerce.number().min(0),
  actif: z.boolean().optional(),
});

const gradeUpdateSchema = gradeSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Aucune donnee a mettre a jour',
});

const repartitionSchema = z.object({
  date_effet: dateSchema,
  taux_sante: z.coerce.number().min(0),
  taux_retraite: z.coerce.number().min(0),
  taux_actif: z.boolean().optional(),
});

const repartitionUpdateSchema = repartitionSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Aucune donnee a mettre a jour',
});

const parametreGeneralUpdateSchema = z
  .object({
    valeur: primitiveValueSchema,
    libelle: z.string().trim().min(1).optional(),
    description: z.union([z.string(), z.null()]).optional(),
    actif: z.boolean().optional(),
    date_debut: optionalDateSchema,
    date_fin: optionalDateSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune donnee a mettre a jour',
  });

const civiliteSchema = z.object({
  libelle_civilite: z.string().trim().min(1, 'Libelle civilite requis'),
  sexe: z.union([z.string(), z.null()]).optional(),
  actif: z.boolean().optional(),
});

const situationSchema = z.object({
  libelle_situation: z.string().trim().min(1, 'Libelle situation requis'),
  actif: z.boolean().optional(),
});

const emploiSchema = z.object({
  libelle_emploi: z.string().trim().min(1, 'Libelle emploi requis'),
  actif: z.boolean().optional(),
});

const lienBeneficiaireSchema = z.object({
  libelle_lien: z.string().trim().min(1, 'Libelle lien requis'),
  actif: z.boolean().optional(),
});

const fonctionSchema = z.object({
  libelle_fonction: z.string().trim().min(1, 'Libelle fonction requis'),
  actif: z.boolean().optional(),
});

const referenceSchemas: Record<ReferenceKind, ZodTypeAny> = {
  civilites: civiliteSchema,
  situationsMatrimoniales: situationSchema,
  emplois: emploiSchema,
  liensBeneficiaires: lienBeneficiaireSchema,
  fonctions: fonctionSchema,
};

const referenceUpdateSchemas: Record<ReferenceKind, ZodTypeAny> = {
  civilites: civiliteSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune donnee a mettre a jour',
  }),
  situationsMatrimoniales: situationSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune donnee a mettre a jour',
  }),
  emplois: emploiSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune donnee a mettre a jour',
  }),
  liensBeneficiaires: lienBeneficiaireSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune donnee a mettre a jour',
  }),
  fonctions: fonctionSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'Aucune donnee a mettre a jour',
  }),
};

function parseId(raw: unknown, label: string): number {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, `${label} invalide`);
  }
  return parsed.data;
}

function parseBody(schema: ZodTypeAny, body: unknown): Record<string, unknown> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');
  }
  return parsed.data as Record<string, unknown>;
}

function normalizeParametreGeneralPayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (!Object.prototype.hasOwnProperty.call(payload, 'valeur')) return payload;
  const value = payload.valeur;
  return { ...payload, valeur: value == null ? null : String(value) };
}

export const parametresController = {
  async grades(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getGrades();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async createGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.createGrade(parseBody(gradeSchema, req.body));
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async updateGrade(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseId(req.params.id, 'ID grade');
      const data = await parametresService.updateGrade(id, parseBody(gradeUpdateSchema, req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async versions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getVersions();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async repartitions(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getRepartitions();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async createRepartition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.createRepartition(parseBody(repartitionSchema, req.body));
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async updateRepartition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseId(req.params.id, 'ID repartition');
      const data = await parametresService.updateRepartition(id, parseBody(repartitionUpdateSchema, req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async activeRepartition(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getActiveRepartition();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async mortalite(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getMortalite();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async generaux(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getParametresGeneraux();
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async updateGeneral(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseId(req.params.id, 'ID parametre general');
      const payload = normalizeParametreGeneralPayload(parseBody(parametreGeneralUpdateSchema, req.body));
      const data = await parametresService.updateParametreGeneral(id, payload);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async generalByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = String(req.params.code ?? '').trim();
      if (!code) {
        throw new AppError(400, 'Code parametre requis');
      }
      const data = await parametresService.getParametreGeneralByCode(code);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async reference(kind: ReferenceKind, _req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.getReference(kind);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async createReference(kind: ReferenceKind, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await parametresService.createReference(kind, parseBody(referenceSchemas[kind], req.body));
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async updateReference(kind: ReferenceKind, req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseId(req.params.id, 'ID referentiel');
      const data = await parametresService.updateReference(
        kind,
        id,
        parseBody(referenceUpdateSchemas[kind], req.body),
      );
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
