import twilio from 'twilio';
import { config } from '../config.js';

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

function toWhatsappAddress(phone: string): string {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
}

export async function sendWhatsappMessage(to: string, body: string): Promise<void> {
  await client.messages.create({
    from: toWhatsappAddress(config.twilio.whatsappFrom),
    to: toWhatsappAddress(to),
    body,
  });
}
