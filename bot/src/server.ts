import express from 'express';
import { config } from './config.js';
import { apifyRouter } from './routes/apify.js';
import { twilioRouter } from './routes/twilio.js';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/webhooks/twilio', twilioRouter);
app.use('/webhooks/apify', apifyRouter);

app.listen(config.port, () => {
  console.log(`Bot server listening on port ${config.port}`);
});
