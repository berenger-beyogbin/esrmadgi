import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { cotisationsService } from '../services/cotisations.service';
import { paiementsService } from '../services/paiements.service';

const idSchema = z.coerce.number().int().positive();

const cotisationSpontaneeSchema = z.object({
  id_adherent: z.coerce.number().int().positive(),
  mode: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide. Format attendu : YYYY-MM-DD'),
  montant: z.coerce.number().positive('Le montant doit etre superieur a 0'),
  id_precompte: z.coerce.number().int().positive().optional(),
  numero_cheque: z.string().trim().max(80).optional(),
  banque_emettrice: z.string().trim().max(150).optional(),
  titulaire_cheque: z.string().trim().max(180).optional(),
  date_emission_cheque: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).superRefine((data, ctx) => {
  if (data.mode !== 'CHEQUE') return;
  for (const field of ['numero_cheque', 'banque_emettrice', 'titulaire_cheque', 'date_emission_cheque'] as const) {
    if (!data[field]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} obligatoire pour un cheque` });
  }
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
      const user = requireUser(req);
      if (parsed.data.mode === 'CHEQUE') {
        const data = await paiementsService.createPaiement(user, {
          adherent_id: String(parsed.data.id_adherent),
          date_paiement: parsed.data.date,
          montant_paiement: parsed.data.montant,
          moyen: 'CHEQUE',
          origine_paiement: parsed.data.banque_emettrice!,
          observation_dgi: parsed.data.id_precompte
            ? `Regularisation du precompte #${parsed.data.id_precompte}`
            : 'Cotisation spontanee par cheque',
          date_valeur: parsed.data.date,
          numero_cheque: parsed.data.numero_cheque,
          banque_emettrice: parsed.data.banque_emettrice,
          titulaire_cheque: parsed.data.titulaire_cheque,
          date_emission_cheque: parsed.data.date_emission_cheque,
          id_precompte: parsed.data.id_precompte,
        });
        res.status(202).json({ data: { paiement: data, en_attente_validation: true }, error: null });
        return;
      }
      const data = await cotisationsService.createCotisationSpontanee(parsed.data);
      res.status(201).json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
