import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
}
