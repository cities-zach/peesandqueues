import { db } from '../lib/db.js';
import { normalizePhone } from '../lib/phone.js';
import { checkTripAccess } from '../lib/trip-access.js';
import { randomBytes } from 'crypto';

const TRIP_DAYS = 7;

function generateInviteToken() {
  return randomBytes(32).toString('base64url');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function validateDiscountCode(code) {
  if (!code || typeof code !== 'string') return null;
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data: row } = await db.from('discount_codes').select('id, percent_off, max_uses, used_count, valid_from, valid_until').eq('code', normalized).single();
  if (!row) return null;
  const now = new Date().toISOString();
  if (row.valid_from && row.valid_from > now) return null;
  if (row.valid_until && row.valid_until < now) return null;
  if (row.max_uses != null && row.used_count >= row.max_uses) return null;
  return { id: row.id, percent_off: row.percent_off };
}

export async function tripsRoutes(fastify) {
  // POST /trips — create trip (paid via Stripe or free via 100% discount code)
  fastify.post('/trips', async (request, reply) => {
    const { name, bathrooms, discountCode } = request.body || {};
    if (!name || !Array.isArray(bathrooms) || bathrooms.length === 0) {
      return reply.code(400).send({ error: 'name and bathrooms (non-empty array) required' });
    }
    const origin = process.env.PUBLIC_ORIGIN || 'http://localhost:5173';
    const priceId = process.env.STRIPE_PRICE_ID;

    const discount = await validateDiscountCode(discountCode);
    if (discountCode !== undefined && discountCode !== null && String(discountCode).trim() !== '') {
      if (!discount) return reply.code(400).send({ error: 'Invalid or expired discount code' });
      if (discount.percent_off < 100) return reply.code(400).send({ error: 'This discount code does not apply a full discount' });
    }
    const isFree = discount && discount.percent_off >= 100;

    const inviteToken = generateInviteToken();
    const status = isFree ? 'paid' : 'pending';
    const expiresAt = isFree ? addDays(new Date(), TRIP_DAYS) : null;

    const { data: trip, error: tripError } = await db.from('trips').insert({
      name,
      invite_token: inviteToken,
      status,
      expires_at: expiresAt,
    }).select('id, name, invite_token').single();
    if (tripError) return reply.code(500).send({ error: tripError.message });

    const bathroomRows = bathrooms.map((b, i) => ({ trip_id: trip.id, name: b.name || `Bathroom ${i + 1}`, sort_order: i }));
    const { data: insertedBathrooms, error: bathError } = await db.from('bathrooms').insert(bathroomRows).select('id');
    if (bathError) {
      await db.from('trips').delete().eq('id', trip.id);
      return reply.code(500).send({ error: bathError.message });
    }
    const queueRows = insertedBathrooms.map((b) => ({ bathroom_id: b.id, trip_id: trip.id }));
    await db.from('queues').insert(queueRows);

    if (isFree) {
      const { data: dc } = await db.from('discount_codes').select('used_count').eq('id', discount.id).single();
      await db.from('discount_codes').update({ used_count: (dc?.used_count ?? 0) + 1 }).eq('id', discount.id);
      const inviteLink = `${origin}/join/${trip.invite_token}`;
      return reply.send({ tripId: trip.id, inviteLink, inviteToken: trip.invite_token, name: trip.name });
    }

    if (!priceId) return reply.code(500).send({ error: 'Stripe not configured' });
    const { stripe } = await import('../lib/stripe.js');
    if (!stripe) return reply.code(500).send({ error: 'Stripe not configured' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/trip/${trip.id}?paid=1`,
      cancel_url: `${origin}/create?cancelled=1`,
      client_reference_id: trip.id,
      metadata: { tripId: trip.id },
    });
    await db.from('trips').update({ stripe_checkout_session_id: session.id }).eq('id', trip.id);
    return reply.send({ checkoutUrl: session.url, tripId: trip.id });
  });

  // POST /trips/:tripId/join — join trip via link (body: name, phone)
  fastify.post('/trips/:tripId/join', async (request, reply) => {
    const { tripId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { name, phone } = request.body || {};
    if (!name || !phone) return reply.code(400).send({ error: 'name and phone required' });
    const normalized = normalizePhone(phone);
    if (!normalized) return reply.code(400).send({ error: 'Invalid phone number' });
    const { data: trip } = await db.from('trips').select('id').eq('id', tripId).single();
    if (!trip) return reply.code(404).send({ error: 'Trip not found' });
    const { data: participant, error } = await db.from('participants').insert({ trip_id: tripId, phone: normalized, display_name: (name || '').trim() }).select('id, trip_id').single();
    if (error) {
      if (error.code === '23505') return reply.code(409).send({ error: 'Already joined this trip with this phone number' });
      return reply.code(500).send({ error: error.message });
    }
    return reply.send({ participantId: participant.id, tripId: participant.trip_id });
  });

  // GET /trips/:tripId — trip + bathrooms + participants (for viewing queues / admin)
  fastify.get('/trips/:tripId', async (request, reply) => {
    const { tripId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { data: trip } = await db.from('trips').select('id, name, invite_token').eq('id', tripId).single();
    if (!trip) return reply.code(404).send({ error: 'Trip not found' });
    const { data: bathrooms } = await db.from('bathrooms').select('id, name, sort_order').eq('trip_id', tripId).order('sort_order');
    const { data: participants } = await db.from('participants').select('id, display_name, phone, joined_at').eq('trip_id', tripId).order('joined_at');
    const maskPhone = (p) => ({ ...p, phone: p.phone ? p.phone.slice(-4).padStart(p.phone.length, '*') : '' });
    return reply.send({
      id: trip.id,
      name: trip.name,
      inviteToken: trip.invite_token,
      bathrooms: bathrooms || [],
      participants: (participants || []).map(maskPhone),
    });
  });

  // PATCH /trips/:tripId — optional admin (update name, bathrooms)
  fastify.patch('/trips/:tripId', async (request, reply) => {
    const { tripId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { name, bathrooms } = request.body || {};
    const { data: trip } = await db.from('trips').select('id').eq('id', tripId).single();
    if (!trip) return reply.code(404).send({ error: 'Trip not found' });
    const updates = {};
    if (name != null) updates.name = name;
    if (Object.keys(updates).length) await db.from('trips').update(updates).eq('id', tripId);
    if (Array.isArray(bathrooms) && bathrooms.length > 0) {
      await db.from('bathrooms').delete().eq('trip_id', tripId);
      const newRows = bathrooms.map((b, i) => ({ trip_id: tripId, name: b.name || `Bathroom ${i + 1}`, sort_order: i }));
      const { data: inserted } = await db.from('bathrooms').insert(newRows).select('id');
      for (const b of inserted || []) {
        await db.from('queues').insert({ bathroom_id: b.id, trip_id: tripId });
      }
    }
    const { data: updated } = await db.from('trips').select('id, name').eq('id', tripId).single();
    return reply.send(updated);
  });
}
