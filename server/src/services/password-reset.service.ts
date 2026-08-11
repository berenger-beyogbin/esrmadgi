import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { UtilisateurRow, utilisateursRepository } from '../repositories/utilisateurs.repository';
import { emailService } from './email.service';
import { smsService } from './sms.service';
import { normalizeRole } from '../utils/roles';

const NO_ACCESS_MESSAGE = 'Aucun acces associe a ce matricule. Contactez le service gestionnaire MADGI.';
const NO_EMAIL_MESSAGE =
  "Aucune adresse email valide n'est enregistree pour ce compte. Contactez le service gestionnaire MADGI pour l'activer.";
const NO_PHONE_MESSAGE =
  "Aucun numero de telephone valide n'est enregistre pour ce compte. Contactez le service gestionnaire MADGI pour l'activer.";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

interface FirstLoginOtpEntry {
  matricule: string;
  authUserId: string;
  phone: string;
  hash: string;
  salt: string;
  expiresAt: number;
  sentAt: number;
  attempts: number;
}

const firstLoginOtpStore = new Map<string, FirstLoginOtpEntry>();

function normalizeMatricule(matricule: string): string {
  return matricule.trim().toUpperCase();
}

function loginEmailFromMatricule(matricule: string): string {
  return `${matricule.trim().toLowerCase()}@madgi.ci`;
}

function isSyntheticEmail(email: string, matricule: string): boolean {
  return email.trim().toLowerCase() === loginEmailFromMatricule(matricule);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 1) || '*';
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

function normalizeMsisdn(rawPhone: string | null | undefined): string | null {
  const raw = String(rawPhone ?? '').trim();
  if (!raw) return null;

  const startsWithPlus = raw.startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;

  if (startsWithPlus) return `+${digits}`;
  if (digits.startsWith('00') && digits.length > 4) return `+${digits.slice(2)}`;
  if (digits.startsWith('225')) return `+${digits}`;
  if (digits.startsWith('0')) return `+225${digits}`;
  if (digits.length === 8 || digits.length === 10) return `+225${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

function maskPhone(msisdn: string): string {
  const digits = msisdn.replace(/[^\d]/g, '');
  const last4 = digits.slice(-4) || '****';
  if (digits.startsWith('225')) return `+225 ** ** ** ${last4}`;
  return `*** *** ${last4}`;
}

function ensureActive(row: UtilisateurRow): void {
  if (row.user_actif !== true) {
    throw new AppError(403, 'Compte utilisateur desactive. Contactez le service gestionnaire MADGI.');
  }
}

function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function getFirstLoginOtp(): string {
  return env.FIRST_LOGIN_FIXED_OTP ?? generateOtp();
}

function hashOtp(code: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

function safeHashEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function purgeExpiredOtps(): void {
  const now = Date.now();
  for (const [key, entry] of firstLoginOtpStore.entries()) {
    if (entry.expiresAt <= now) firstLoginOtpStore.delete(key);
  }
}

async function resolveContactEmail(matricule: string, row: UtilisateurRow): Promise<string | null> {
  if (row.id_adherent) {
    const adherent = await utilisateursRepository.findAdherentByMatricule(matricule);
    if (adherent?.email && !isSyntheticEmail(adherent.email, matricule)) return adherent.email;
  }
  if (row.email && !isSyntheticEmail(row.email, matricule)) return row.email;
  return null;
}

async function resolveContactPhone(matricule: string, row: UtilisateurRow): Promise<{ phone: string; maskedPhone: string }> {
  const adherent = await utilisateursRepository.findAdherentByMatricule(matricule);
  const phone = normalizeMsisdn(adherent?.telephone ?? row.telephone);

  if (!phone) {
    throw new AppError(400, NO_PHONE_MESSAGE);
  }

  return { phone, maskedPhone: maskPhone(phone) };
}

async function sendResetLink(matricule: string, row: UtilisateurRow, loginEmail: string): Promise<string> {
  const contactEmail = await resolveContactEmail(matricule, row);
  if (!contactEmail) {
    throw new AppError(400, NO_EMAIL_MESSAGE);
  }

  const actionLink = await utilisateursRepository.generateRecoveryLink(loginEmail, env.FRONTEND_URL);

  await emailService.sendMail({
    to: contactEmail,
    subject: 'MADGI ESR - Definissez votre mot de passe',
    html: `
      <p>Bonjour,</p>
      <p>Cliquez sur le lien ci-dessous pour definir votre mot de passe d'acces a la plateforme MADGI ESR :</p>
      <p><a href="${actionLink}">${actionLink}</a></p>
      <p>Ce lien est valable une heure. Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
    `,
  });

  return maskEmail(contactEmail);
}

async function findAccessibleUser(matricule: string): Promise<{ row: UtilisateurRow; loginEmail: string }> {
  const row = await utilisateursRepository.findByMatricule(matricule);
  if (!row?.auth_user_id) throw new AppError(404, NO_ACCESS_MESSAGE);
  ensureActive(row);

  const authUser = await utilisateursRepository.getAuthUserById(row.auth_user_id);
  if (!authUser?.email) throw new AppError(404, NO_ACCESS_MESSAGE);

  return { row, loginEmail: authUser.email };
}

async function findFirstLoginUser(rawMatricule: string): Promise<{
  matricule: string;
  row: UtilisateurRow;
  loginEmail: string;
  authUserId: string;
}> {
  const matricule = normalizeMatricule(rawMatricule);
  const { row, loginEmail } = await findAccessibleUser(matricule);
  const role = normalizeRole(row.profil);

  if (role !== 'ADHERENT') {
    throw new AppError(400, 'La premiere connexion simplifiee est reservee aux adherents.');
  }

  const authUserId = String(row.auth_user_id);
  const authUser = await utilisateursRepository.getAuthUserById(authUserId);
  if (!authUser?.email) throw new AppError(404, NO_ACCESS_MESSAGE);
  if (!authUser.user_metadata?.must_change_password) {
    throw new AppError(400, 'Ce compte est deja active. Connectez-vous avec votre mot de passe.');
  }

  return { matricule, row, loginEmail, authUserId };
}

export const passwordResetService = {
  // Repond toujours 200 avec la meme forme, que le matricule existe ou non, soit actif ou non,
  // et quel que soit le profil : seul un compte adherent avec must_change_password=true
  // declenche le parcours premiere connexion. Cela evite qu'un appelant non authentifie
  // puisse enumerer les matricules valides via des codes HTTP/erreurs distincts.
  async checkFirstLogin(rawMatricule: string): Promise<{ firstLogin: boolean }> {
    const matricule = normalizeMatricule(rawMatricule);
    const row = await utilisateursRepository.findByMatricule(matricule);
    if (!row?.auth_user_id || row.user_actif !== true) return { firstLogin: false };

    const role = normalizeRole(row.profil);
    if (role !== 'ADHERENT') return { firstLogin: false };

    const authUser = await utilisateursRepository.getAuthUserById(row.auth_user_id);
    if (!authUser?.email) return { firstLogin: false };

    return { firstLogin: Boolean(authUser.user_metadata?.must_change_password) };
  },

  async sendFirstLoginOtp(rawMatricule: string): Promise<{
    maskedPhone: string;
    expiresInSeconds: number;
    smsSkipped?: boolean;
    debugOtpCode?: string;
  }> {
    purgeExpiredOtps();

    const { matricule, row, authUserId } = await findFirstLoginUser(rawMatricule);
    const existing = firstLoginOtpStore.get(matricule);
    const now = Date.now();

    if (!env.FIRST_LOGIN_SMS_STANDBY && existing && now - existing.sentAt < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
      throw new AppError(429, `Un code vient deja d'etre envoye. Patientez ${waitSeconds} seconde(s) avant un nouvel envoi.`);
    }

    const otp = getFirstLoginOtp();
    const salt = randomBytes(16).toString('hex');
    let phone = '';
    let maskedPhone = '';

    if (!env.FIRST_LOGIN_SMS_STANDBY) {
      const contact = await resolveContactPhone(matricule, row);
      phone = contact.phone;
      maskedPhone = contact.maskedPhone;
      const message = `MADGI ESR: votre code de creation de mot de passe est ${otp}. Il expire dans 10 minutes.`;
      await smsService.sendSms({ to: phone, message });
    } else if (env.IS_DEV) {
      console.info(`[SMS:STANDBY] Envoi SMS suspendu pour ${matricule}. OTP fixe actif.`);
    }

    firstLoginOtpStore.set(matricule, {
      matricule,
      authUserId,
      phone,
      hash: hashOtp(otp, salt),
      salt,
      expiresAt: now + OTP_TTL_MS,
      sentAt: now,
      attempts: 0,
    });

    return {
      maskedPhone,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      smsSkipped: env.FIRST_LOGIN_SMS_STANDBY,
      debugOtpCode: env.FIRST_LOGIN_OTP_DEBUG ? otp : undefined,
    };
  },

  async setFirstLoginPassword(
    rawMatricule: string,
    rawOtpCode: string,
    newPassword: string,
  ): Promise<{ login: string; email: string }> {
    purgeExpiredOtps();

    const { matricule, loginEmail, authUserId } = await findFirstLoginUser(rawMatricule);
    const entry = firstLoginOtpStore.get(matricule);
    const otpCode = rawOtpCode.trim();

    if (!entry || entry.authUserId !== authUserId) {
      throw new AppError(400, 'Code SMS absent ou expire. Demandez un nouveau code.');
    }

    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      firstLoginOtpStore.delete(matricule);
      throw new AppError(429, 'Trop de tentatives incorrectes. Demandez un nouveau code SMS.');
    }

    const submittedHash = hashOtp(otpCode, entry.salt);
    if (!safeHashEquals(submittedHash, entry.hash)) {
      entry.attempts += 1;
      if (entry.attempts >= OTP_MAX_ATTEMPTS) firstLoginOtpStore.delete(matricule);
      throw new AppError(403, 'Code SMS incorrect. Verifiez le code recu.');
    }

    await utilisateursRepository.updateAuthUser(authUserId, {
      password: newPassword,
      matricule,
      profil: 'ADHERENT',
      must_change_password: false,
    });

    firstLoginOtpStore.delete(matricule);

    return { login: matricule, email: loginEmail };
  },

  // Repond toujours 200 avec la meme forme (maskedEmail eventuellement absent) que le
  // matricule existe ou non, soit actif ou non, ait un email de contact ou non : seules
  // les erreurs serveur inattendues (5xx) remontent. Le frontend affiche deja un message
  // generique de repli quand maskedEmail est absent (voir Login.tsx). Cela evite qu'un
  // appelant non authentifie puisse enumerer les matricules valides.
  async requestPasswordReset(rawMatricule: string): Promise<{ maskedEmail: string | null }> {
    const matricule = normalizeMatricule(rawMatricule);
    try {
      const { row, loginEmail } = await findAccessibleUser(matricule);
      const maskedEmail = await sendResetLink(matricule, row, loginEmail);
      return { maskedEmail };
    } catch (err) {
      if (err instanceof AppError && err.statusCode < 500) {
        return { maskedEmail: null };
      }
      throw err;
    }
  },
};
