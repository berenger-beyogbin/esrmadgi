import mysql from 'mysql2/promise';
import { env } from '../config/env';
import { ExternalAgentInfo } from '../types';

let _pool: mysql.Pool | null = null;

function getMysqlPool(): mysql.Pool | null {
  if (!env.MYSQL_HOST || !env.MYSQL_USER || !env.MYSQL_PASSWORD || !env.MYSQL_DATABASE) {
    return null;
  }
  if (!_pool) {
    _pool = mysql.createPool({
      host: env.MYSQL_HOST,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      password: env.MYSQL_PASSWORD,
      database: env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 8000,
      ssl: undefined,
    });
  }
  return _pool;
}

function firstString(raw: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function firstStringByKeyHint(raw: Record<string, unknown>, hints: string[], depth = 0): string {
  if (depth > 2) return '';

  for (const [key, value] of Object.entries(raw)) {
    const keyNorm = normalizeKey(key);
    const isCandidateKey = hints.some((hint) => keyNorm.includes(hint));

    if (isCandidateKey && value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = firstStringByKeyHint(value as Record<string, unknown>, hints, depth + 1);
      if (nested) return nested;
    }
  }

  return '';
}

function extractGrade(raw: Record<string, unknown>): string | null {
  const explicit = firstString(raw, [
    'grade',
    'Grade',
    'GRADE',
    'id_grade',
    'idGrade',
    'IdGrade',
    'grade_id',
    'gradeId',
    'code_grade',
    'codeGrade',
    'CodeGrade',
    'libelle_grade',
    'libelleGrade',
    'LibelleGrade',
    'categorie',
    'Categorie',
    'CATEGORIE',
    'classe',
    'Classe',
    'CLASSE',
    'codeCategorie',
    'categorieCode',
    'echelle',
    'Echelle',
    'corps',
    'Corps',
  ]);

  return (
    explicit ||
    firstStringByKeyHint(raw, [
      'grade',
      'idgrade',
      'gradeid',
      'codegrade',
      'libellegrade',
      'categorie',
      'classe',
      'echelle',
      'corps',
    ]) ||
    null
  );
}

function normalizeDate(rawValue: unknown): string | null {
  if (!rawValue) return null;
  const raw = String(rawValue).trim();
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return raw.split('T')[0];
}

function normalizeCivilite(raw: Record<string, unknown>): string | null {
  const direct = firstString(raw, [
    'civilite',
    'Civilite',
    'CIVILITE',
    'libelleCivilite',
    'LibelleCivilite',
    'titre',
    'Titre',
  ]);
  const sexe = firstString(raw, ['sexe', 'Sexe', 'SEXE', 'genre', 'Genre', 'GENRE', 'codeSexe', 'CodeSexe']);
  const value = (direct || sexe).trim();
  if (!value) return null;

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\s_-]+/g, '')
    .toUpperCase();

  if (['M', 'MR', 'MRS', 'MONSIEUR', 'H', 'HOMME', 'MASCULIN', 'MASC'].includes(normalized)) {
    return 'Monsieur';
  }
  if (['F', 'FEMME', 'FEMININ', 'FEM', 'MME', 'MADAME'].includes(normalized)) {
    return 'Madame';
  }
  if (['MLLE', 'MADEMOISELLE'].includes(normalized)) {
    return 'Mademoiselle';
  }

  return value;
}

function mapExternalAgent(
  raw: Record<string, unknown>,
  matricule: string,
  source: 'MYSQL' | 'SIAPS',
): ExternalAgentInfo | null {
  const nom = firstString(raw, ['nom', 'Nom', 'NOM', 'name', 'Name']);
  const prenoms = firstString(raw, ['prenoms', 'Prenoms', 'PRENOMS', 'prenom', 'Prenom', 'firstName']);
  const matriculeValue =
    source === 'SIAPS'
      ? matricule
      : firstString(raw, ['matricule', 'Matricule', 'MATRICULE']) || matricule;

  if (!nom && !prenoms) return null;

  return {
    found: true,
    matricule: matriculeValue.trim().toUpperCase(),
    nom: nom.trim().toUpperCase(),
    prenoms,
    date_naissance: normalizeDate(raw.date_naissance ?? raw.dateNaissance ?? raw.DateNaissance ?? raw.DATE_NAISSANCE),
    telephone: firstString(raw, ['telephone', 'Telephone', 'TELEPHONE', 'tel', 'mobile']) || null,
    email: firstString(raw, ['email', 'Email', 'EMAIL', 'mail']) || null,
    direction: firstString(raw, ['direction', 'Direction', 'DIRECTION']) || null,
    emploi: firstString(raw, ['emploi', 'Emploi', 'EMPLOI', 'fonction', 'Fonction']) || null,
    grade: extractGrade(raw),
    civilite: normalizeCivilite(raw),
    situation_matrimoniale:
      firstString(raw, ['situation_matrimoniale', 'situationMatrimoniale', 'SituationMatrimoniale']) || null,
    source,
    raw,
  };
}

async function getSiapsToken(): Promise<string> {
  const baseUrl = env.SIAPS_BASE_URL!;
  const res = await fetch(`${baseUrl}/getToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      slug: env.SIAPS_SLUG ?? '',
    },
    body: JSON.stringify({
      email: env.SIAPS_EMAIL ?? '',
      mdp: env.SIAPS_PASSWORD ?? '',
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`SIAPS getToken - HTTP ${res.status}`);

  const body = (await res.json()) as Record<string, unknown>;
  if (body.hasError === true || body.HasError === true) {
    throw new Error('SIAPS getToken : reponse en erreur');
  }

  const token =
    body.Token ??
    body.token ??
    body.access_token ??
    (body.Data as Record<string, unknown> | undefined)?.Token ??
    (body.data as Record<string, unknown> | undefined)?.token;

  if (!token) throw new Error('SIAPS getToken : token absent de la reponse');
  return String(token);
}

function todayForSiaps(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return env.SIAPS_DATE_FORMAT === 'iso' ? `${yyyy}-${mm}-${dd}` : `${yyyy}${mm}${dd}`;
}

function extractSiapsData(body: Record<string, unknown>): Record<string, unknown> | null {
  if (body.hasError === true || body.HasError === true) return null;

  const candidate = body.Data ?? body.data ?? body.assure ?? body.Assure ?? body.client ?? body.Client ?? body;
  if (Array.isArray(candidate)) {
    return (candidate[0] as Record<string, unknown> | undefined) ?? null;
  }
  if (candidate && typeof candidate === 'object') {
    return candidate as Record<string, unknown>;
  }
  return null;
}

export const agentsRepository = {
  async searchInMysql(matricule: string): Promise<ExternalAgentInfo | null> {
    const pool = getMysqlPool();
    if (!pool) return null;

    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT matricule, nom, prenoms, date_naissance FROM client WHERE matricule = ? LIMIT 1',
      [matricule],
    );

    const row = rows[0];
    if (!row) return null;

    return mapExternalAgent(row as Record<string, unknown>, matricule, 'MYSQL');
  },

  async searchInSiaps(matricule: string): Promise<ExternalAgentInfo | null> {
    if (!env.SIAPS_BASE_URL || !env.SIAPS_SLUG || !env.SIAPS_EMAIL || !env.SIAPS_PASSWORD) {
      return null;
    }

    const token = await getSiapsToken();
    const url = new URL(`${env.SIAPS_BASE_URL}/getRetraites`);
    url.searchParams.set('matricule', matricule);
    url.searchParams.set('date', todayForSiaps());

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        slug: env.SIAPS_SLUG,
        token,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`SIAPS getRetraites - HTTP ${res.status}`);

    const body = (await res.json()) as Record<string, unknown>;
    const raw = extractSiapsData(body);
    if (!raw) return null;

    return mapExternalAgent(raw, matricule, 'SIAPS');
  },
};
