import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

interface TurnstileVerifyResponse {
  success?: boolean;
  'error-codes'?: string[];
}

export const turnstileService = {
  async verify(token: string | undefined, remoteIp?: string): Promise<void> {
    if (!env.TURNSTILE_SECRET_KEY) {
      if (env.NODE_ENV === 'production') {
        throw new AppError(503, 'Protection CAPTCHA non configuree.');
      }
      return;
    }

    if (!token || token.trim().length === 0) {
      throw new AppError(400, 'Verification CAPTCHA requise.');
    }

    const params = new URLSearchParams({
      secret: env.TURNSTILE_SECRET_KEY,
      response: token,
    });
    if (remoteIp) params.set('remoteip', remoteIp);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new AppError(502, 'Verification CAPTCHA indisponible.');
    }

    const result = (await response.json()) as TurnstileVerifyResponse;
    if (result.success !== true) {
      throw new AppError(400, 'Verification CAPTCHA invalide.');
    }
  },
};
