import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

export const emailService = {
  async sendMail(input: { to: string; subject: string; html: string }): Promise<void> {
    const client = getTransporter();
    if (!client) {
      if (env.IS_DEV) {
        console.info('[EMAIL:DEV] SMTP non configure — email simule dans la console :', input);
        return;
      }
      throw new Error('Service email non configure (variables SMTP manquantes).');
    }

    await client.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
  },
};
