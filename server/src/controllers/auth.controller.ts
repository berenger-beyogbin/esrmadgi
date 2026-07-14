import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { authService } from '../services/auth.service';
import { passwordResetService } from '../services/password-reset.service';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy';

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Authentification requise');
  }
  return req.user;
}

const passwordChangeSchema = z.object({
  new_password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
});

const matriculeSchema = z.object({
  matricule: z
    .string()
    .trim()
    .min(2, 'Matricule requis')
    .max(20, 'Matricule invalide'),
});

const firstLoginPasswordSchema = matriculeSchema
  .extend({
    otp_code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Code SMS invalide. Saisissez les 6 chiffres recus.'),
    new_password: z.string().refine(isStrongPassword, PASSWORD_POLICY_MESSAGE),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirm_password'],
  });

function parseMatricule(body: unknown): string {
  const parsed = matriculeSchema.safeParse(body);
  if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Matricule requis');
  return parsed.data.matricule;
}

export const authController = {
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = authService.getCurrentUser(requireUser(req));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = passwordChangeSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Mot de passe invalide');

      const data = await authService.changePassword(requireUser(req), parsed.data.new_password);
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async firstLoginCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await passwordResetService.checkFirstLogin(parseMatricule(req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async sendFirstLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await passwordResetService.sendFirstLoginOtp(parseMatricule(req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async setFirstLoginPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = firstLoginPasswordSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(400, parsed.error.errors[0]?.message ?? 'Donnees invalides');

      const data = await passwordResetService.setFirstLoginPassword(
        parsed.data.matricule,
        parsed.data.otp_code,
        parsed.data.new_password,
      );
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },

  async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await passwordResetService.requestPasswordReset(parseMatricule(req.body));
      res.json({ data, error: null });
    } catch (err) {
      next(err);
    }
  },
};
