// Edge Function Supabase — Recherche agent par matricule
// Sources : MySQL externe (ESR_GetClientParMatricule) + API SIAPS (ESR_GetToken + ESR_GetAssure)
// Secrets requis (à configurer dans le Dashboard Supabase > Project Settings > Edge Functions > Secrets) :
//   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
//   SIAPS_BASE_URL, SIAPS_SLUG, SIAPS_EMAIL, SIAPS_PASSWORD

import mysql from 'npm:mysql2/promise';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExternalAgentInfo {
  matricule: string;
  nom: string;
  prenoms: string;
  date_naissance?: string | null;
  source: 'MYSQL' | 'SIAPS';
  found: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function requireAuthenticatedRequest(req: Request): Promise<Response | null> {
  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ found: false, data: null, error: 'Authentification requise' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ found: false, data: null, error: 'Configuration Supabase incomplete' }, 500);
  }

  const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authorization,
      apikey: supabaseAnonKey,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!authRes.ok) {
    return jsonResponse({ found: false, data: null, error: 'Session invalide ou expiree' }, 401);
  }

  return null;
}

// --- Source 1 : MySQL externe ---
async function searchMysql(matricule: string): Promise<ExternalAgentInfo | null> {
  const host = Deno.env.get('MYSQL_HOST');
  const user = Deno.env.get('MYSQL_USER');
  const password = Deno.env.get('MYSQL_PASSWORD');
  const database = Deno.env.get('MYSQL_DATABASE');

  if (!host || !user || !password || !database) return null;

  const port = parseInt(Deno.env.get('MYSQL_PORT') ?? '3306', 10);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    connectTimeout: 8000,
  });

  try {
    const [rows] = await conn.execute(
      'SELECT matricule, nom, prenoms, date_naissance FROM client WHERE matricule = ? LIMIT 1',
      [matricule],
    );

    const row = (rows as Record<string, unknown>[])[0];
    if (!row) return null;

    let dateNaissance: string | null = null;
    if (row.date_naissance instanceof Date) {
      dateNaissance = row.date_naissance.toISOString().split('T')[0];
    } else if (typeof row.date_naissance === 'string' && row.date_naissance) {
      dateNaissance = row.date_naissance.split('T')[0];
    }

    return {
      found: true,
      matricule: String(row.matricule ?? '').trim().toUpperCase(),
      nom: String(row.nom ?? '').trim().toUpperCase(),
      prenoms: String(row.prenoms ?? '').trim(),
      date_naissance: dateNaissance,
      source: 'MYSQL',
    };
  } finally {
    await conn.end();
  }
}

// --- Source 2 : API SIAPS ---
async function getSiapsToken(): Promise<string> {
  const baseUrl = Deno.env.get('SIAPS_BASE_URL') ?? '';
  const slug = Deno.env.get('SIAPS_SLUG') ?? '';
  const email = Deno.env.get('SIAPS_EMAIL') ?? '';
  const password = Deno.env.get('SIAPS_PASSWORD') ?? '';

  const res = await fetch(`${baseUrl}/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, email, password }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`SIAPS getToken — HTTP ${res.status}`);

  const body = await res.json();
  const token = body?.token ?? body?.access_token ?? body?.data?.token;
  if (!token) throw new Error('SIAPS getToken : token absent de la réponse');
  return String(token);
}

async function searchSiaps(matricule: string): Promise<ExternalAgentInfo | null> {
  const baseUrl = Deno.env.get('SIAPS_BASE_URL');
  const email = Deno.env.get('SIAPS_EMAIL');
  if (!baseUrl || !email) return null;

  const token = await getSiapsToken();
  const today = new Date().toISOString().split('T')[0];

  const res = await fetch(`${baseUrl}/getRetraites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ matricule, date: today }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`SIAPS getRetraites — HTTP ${res.status}`);

  const body = await res.json();
  const agent = body?.data ?? body?.assure ?? body;
  if (!agent || (!agent.nom && !agent.name)) return null;

  let dateNaissance: string | null = null;
  if (agent.date_naissance) {
    dateNaissance = String(agent.date_naissance).split('T')[0];
  } else if (agent.dateNaissance) {
    dateNaissance = String(agent.dateNaissance).split('T')[0];
  }

  return {
    found: true,
    matricule: matricule.toUpperCase(),
    nom: String(agent.nom ?? agent.name ?? '').trim().toUpperCase(),
    prenoms: String(agent.prenoms ?? agent.prenom ?? agent.firstName ?? '').trim(),
    date_naissance: dateNaissance,
    source: 'SIAPS',
  };
}

// --- Handler principal ---
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ found: false, data: null, error: 'Méthode non autorisée' }, 405);
  }

  const authError = await requireAuthenticatedRequest(req);
  if (authError) return authError;

  let matricule: string;
  try {
    const body = await req.json();
    matricule = String(body?.matricule ?? '').trim().toUpperCase();
  } catch {
    return jsonResponse({ found: false, data: null, error: 'Corps JSON invalide' }, 400);
  }

  if (!matricule || matricule.length < 2 || matricule.length > 20) {
    return jsonResponse({ found: false, data: null, error: 'Matricule invalide (vide ou longueur hors norme)' }, 400);
  }

  try {
    let agent: ExternalAgentInfo | null = null;

    try {
      agent = await searchMysql(matricule);
    } catch (err) {
      console.error('[search-agent] MySQL:', err);
    }

    if (!agent) {
      try {
        agent = await searchSiaps(matricule);
      } catch (err) {
        console.error('[search-agent] SIAPS:', err);
      }
    }

    if (agent) {
      return jsonResponse({ found: true, data: agent, error: null });
    }

    return jsonResponse({ found: false, data: null, error: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur interne';
    console.error('[search-agent] Unexpected error:', err);
    return jsonResponse({ found: false, data: null, error: msg }, 500);
  }
});
