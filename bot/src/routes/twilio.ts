import { Router, type Request } from 'express';
import twilio from 'twilio';
import { config } from '../config.js';
import { handleAwaitingLanguage, handleAwaitingLocation, startOnboarding } from '../flows/onboarding.js';
import { handleActiveSubscriber } from '../flows/replies.js';
import { getSubscriberStore } from '../services/subscribers.js';

export const twilioRouter = Router();

interface TwilioInboundBody {
  From?: string;
  Body?: string;
  Latitude?: string;
  Longitude?: string;
}

// CLAUDE.md section 9: "Verify Twilio request signatures." Twilio signs
// every webhook request with the exact public URL it called, so this only
// works when PUBLIC_BASE_URL matches what's actually configured in the
// Twilio console (the ngrok URL locally, or the real deployed URL).
function verifySignature(req: Request): boolean {
  const signature = req.header('X-Twilio-Signature');
  if (!signature) return false;
  const url = `${config.publicBaseUrl}${req.originalUrl}`;
  return twilio.validateRequest(config.twilio.authToken, signature, url, req.body as Record<string, string>);
}

twilioRouter.post('/inbound', async (req, res) => {
  if (!config.publicBaseUrl) {
    console.warn('PUBLIC_BASE_URL is not set — cannot verify the Twilio request signature, refusing the request.');
    res.status(500).send('Server misconfigured: PUBLIC_BASE_URL not set.');
    return;
  }
  if (!verifySignature(req)) {
    res.status(403).send('Invalid Twilio signature.');
    return;
  }

  const body = req.body as TwilioInboundBody;
  const phone = body.From ?? '';
  const text = (body.Body ?? '').trim();
  const pin = body.Latitude && body.Longitude ? { latitude: Number(body.Latitude), longitude: Number(body.Longitude) } : undefined;

  if (!phone) {
    res.status(400).send('Missing From.');
    return;
  }

  const subscriber = await getSubscriberStore().get(phone);

  let reply: string;
  if (!subscriber) {
    reply = text.toLowerCase() === 'join' ? await startOnboarding(phone) : 'Hi! To get free flood alerts for your area, send JOIN. Msg & data rates may apply.';
  } else if (subscriber.status === 'awaiting_language') {
    reply = await handleAwaitingLanguage(subscriber, text);
  } else if (subscriber.status === 'awaiting_location') {
    reply = await handleAwaitingLocation(subscriber, text, pin);
  } else {
    reply = await handleActiveSubscriber(subscriber, text);
  }

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.type('text/xml').send(twiml.toString());
});
