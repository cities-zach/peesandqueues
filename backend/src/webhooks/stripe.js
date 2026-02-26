import { Readable } from 'stream';
import { db } from '../lib/db.js';
import Stripe from 'stripe';

const TRIP_DAYS = 7;

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function stripeWebhook(fastify) {
  fastify.post('/webhooks/stripe', {
    preParsing: async (request, reply, payload) => {
      const chunks = [];
      for await (const chunk of payload) chunks.push(chunk);
      request.rawBody = Buffer.concat(chunks);
      return Readable.from(request.rawBody);
    },
  }, async (request, reply) => {
    const rawBody = request.rawBody;
    const sig = request.headers['stripe-signature'];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !sig) {
      return reply.code(400).send({ error: 'Missing signature or secret' });
    }
    let event;
    try {
      event = Stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      return reply.code(400).send({ error: `Webhook signature verification failed: ${err.message}` });
    }
    if (event.type !== 'checkout.session.completed') {
      return reply.send({ received: true });
    }
    const session = event.data.object;
    const tripId = session.client_reference_id || session.metadata?.tripId;
    if (!tripId) {
      return reply.send({ received: true });
    }
    const { data: trip } = await db.from('trips').select('id, status').eq('id', tripId).single();
    if (!trip) return reply.send({ received: true });
    if (trip.status === 'paid') return reply.send({ received: true });
    const expiresAt = addDays(new Date(), TRIP_DAYS);
    await db.from('trips').update({ status: 'paid', expires_at: expiresAt }).eq('id', tripId);
    return reply.send({ received: true });
  });
}
