import { env } from '../config/env';

function isSmsConfigured(): boolean {
  return Boolean(env.SMS_API_URL && env.SMS_API_USERNAME && env.SMS_API_PASSWORD);
}

export const smsService = {
  async sendSms(input: { to: string; message: string }): Promise<void> {
    if (!isSmsConfigured()) {
      if (env.IS_DEV) {
        console.info('[SMS:DEV] SMS non configure — envoi simule :', input);
        return;
      }
      throw new Error('Service SMS non configure.');
    }

    const url = new URL(String(env.SMS_API_URL));
    url.searchParams.set('username', String(env.SMS_API_USERNAME));
    url.searchParams.set('password', String(env.SMS_API_PASSWORD));
    if (env.SMS_API_SERVICE_ID) url.searchParams.set('serviceid', env.SMS_API_SERVICE_ID);
    url.searchParams.set('msisdn', input.to);
    url.searchParams.set('msg', input.message);

    const response = await fetch(url);
    const body = await response.text().catch(() => '');

    if (!response.ok) {
      throw new Error(`Echec envoi SMS (${response.status}).`);
    }

    if (env.IS_DEV) {
      console.info('[SMS] Reponse API SMS :', body || '(vide)');
    }
  },
};
