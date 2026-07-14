import { supabase } from '../services/supabaseClient';
import { DBUser } from '../types';
import { toFrenchErrorMessage } from '../utils/errorMessages';

let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

function notifyIfSessionExpired(status: number): void {
  if (status === 401) sessionExpiredHandler?.();
}

function readApiError(json: unknown): string {
  const err = (json as Record<string, unknown>)?.error;
  return toFrenchErrorMessage(typeof err === 'string' ? err : 'Erreur de traitement du service.');
}

const BASE_URL =
  ((import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4000';

async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if ((import.meta as any).env.DEV) {
    const rawDemoUser = localStorage.getItem('madgi_user_session');
    if (rawDemoUser) {
      try {
        const demoUser = JSON.parse(rawDemoUser) as Partial<DBUser>;
        if (typeof demoUser.id === 'string' && demoUser.id.startsWith('demo-') && demoUser.role) {
          headers['x-madgi-demo-role'] = demoUser.role;
          headers['x-madgi-demo-id'] = String(demoUser.id);
          headers['x-madgi-demo-matricule'] = String(demoUser.matricule ?? '');
          headers['x-madgi-demo-email'] = String(demoUser.email ?? '');
          headers['x-madgi-demo-id-adherent'] = String(demoUser.id_adherent ?? '');
        }
      } catch {
        localStorage.removeItem('madgi_user_session');
      }
    }
  }

  return headers;
}

export async function apiGet<T = unknown>(
  path: string,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: await buildHeaders(),
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { data: null, error: 'Reponse du service invalide.' };
    }
    if (!res.ok) {
      notifyIfSessionExpired(res.status);
      return { data: null, error: readApiError(json) };
    }
    return { data: json as T, error: null };
  } catch (e: unknown) {
    return { data: null, error: toFrenchErrorMessage(e) };
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: await buildHeaders(),
      body: JSON.stringify(body),
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { data: null, error: 'Reponse du service invalide.' };
    }
    if (!res.ok) {
      notifyIfSessionExpired(res.status);
      return { data: null, error: readApiError(json) };
    }
    return { data: json as T, error: null };
  } catch (e: unknown) {
    return { data: null, error: toFrenchErrorMessage(e) };
  }
}

export async function apiPut<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: await buildHeaders(),
      body: JSON.stringify(body),
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { data: null, error: 'Reponse du service invalide.' };
    }
    if (!res.ok) {
      notifyIfSessionExpired(res.status);
      return { data: null, error: readApiError(json) };
    }
    return { data: json as T, error: null };
  } catch (e: unknown) {
    return { data: null, error: toFrenchErrorMessage(e) };
  }
}

export async function apiDelete<T = unknown>(
  path: string,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: await buildHeaders(),
    });
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { data: null, error: 'Reponse du service invalide.' };
    }
    if (!res.ok) {
      notifyIfSessionExpired(res.status);
      return { data: null, error: readApiError(json) };
    }
    return { data: json as T, error: null };
  } catch (e: unknown) {
    return { data: null, error: toFrenchErrorMessage(e) };
  }
}

export const apiClient = { get: apiGet, post: apiPost, put: apiPut, delete: apiDelete };

