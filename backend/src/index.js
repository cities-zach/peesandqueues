import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { tripsRoutes } from './routes/trips.js';
import { joinRoutes } from './routes/join.js';
import { queuesRoutes } from './routes/queues.js';
import { twilioWebhook } from './webhooks/twilio.js';
import { stripeWebhook } from './webhooks/stripe.js';

const port = Number(process.env.PORT) || 3000;
const origin = process.env.PUBLIC_ORIGIN || 'http://localhost:5173';

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: origin, credentials: true });
await fastify.register(tripsRoutes, { prefix: '/api' });
await fastify.register(joinRoutes, { prefix: '/api' });
await fastify.register(queuesRoutes, { prefix: '/api' });
await fastify.register(twilioWebhook);
await fastify.register(stripeWebhook);

fastify.get('/api/health', async () => ({ ok: true }));

// Cron-callable: run reminder job (active > 30 min → send reminder SMS)
fastify.post('/api/cron/reminders', async (request, reply) => {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  const { runReminderJob } = await import('./lib/reminder-job.js');
  const sent = await runReminderJob();
  return reply.send({ ok: true, remindersSent: sent });
});

try {
  await fastify.listen({ port, host: '0.0.0.0' });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
