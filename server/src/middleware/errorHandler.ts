import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ data: null, error: err.message });
    return;
  }

  const status = (err as { status?: number; statusCode?: number }).status ?? (err as { statusCode?: number }).statusCode;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ data: null, error: err.message || 'Requête invalide.' });
    return;
  }

  console.error('[error]', err.message);
  res.status(500).json({
    data: null,
    error:
      "Impossible de traiter la demande pour le moment. Veuillez réessayer. Si le problème persiste, contactez l'administrateur.",
  });
}
