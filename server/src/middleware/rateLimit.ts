import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

function rateLimitHandler(message: string) {
  return (_req: Request, res: Response): void => {
    res.status(429).json({ data: null, error: message });
  };
}

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de requetes. Veuillez patienter avant de reessayer.'),
});

export const publicReadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de requetes publiques. Veuillez patienter avant de reessayer.'),
});

export const publicAgentSearchRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de recherches de matricule. Veuillez patienter avant de reessayer.'),
});

export const publicSubmissionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de soumissions. Veuillez patienter avant de reessayer.'),
});

export const publicFirstLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de tentatives. Veuillez patienter avant de reessayer.'),
});

export const publicFirstLoginOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de demandes de code SMS. Veuillez patienter avant de reessayer.'),
});

export const publicPasswordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Trop de demandes de reinitialisation. Veuillez patienter avant de reessayer.'),
});
