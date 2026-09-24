import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Loaded from the monorepo root .env regardless of the process's cwd, since
// npm workspace scripts can be invoked from either the repo root or bot/.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  twilio: {
    accountSid: required('TWILIO_ACCOUNT_SID'),
    authToken: required('TWILIO_AUTH_TOKEN'),
    whatsappFrom: required('TWILIO_WHATSAPP_FROM'),
  },
  joinNumber: process.env.BOT_JOIN_NUMBER ?? '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
  apifyToken: process.env.APIFY_TOKEN,
  // Shared secrets embedded in the URLs configured in the Apify Console
  // (actor webhook) and used by whoever triggers the demo simulation —
  // there's no signature scheme for these the way there is for Twilio, so a
  // long random query-param secret is the practical MVP equivalent.
  apifyWebhookSecret: process.env.APIFY_WEBHOOK_SECRET ?? '',
  adminSecret: process.env.ADMIN_SECRET ?? '',
};
