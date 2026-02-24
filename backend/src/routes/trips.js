import { db } from '../lib/db.js';
import { normalizePhone } from '../lib/phone.js';
import { randomBytes } from 'crypto';

function generateInviteToken() {
  return randomBytes(32).toString('base64url');
}

export async function tripsRoutes(fastify) {
  // POST /trips — create trip
  fastify.post('/trips', async (request, reply) => {
    const { name, bathrooms } = request.body || {};
    if (!name || !Array.isArray(bathrooms) || bathrooms.length === 0) {
      return reply.code(400).send({ error: 'name and bathrooms (non-empty array) required' });
    }
    const inviteToken = generateInviteToken();
    const origin = process.env.PUBLIC_ORIGIN || 'http://localhost:5173';
    const { data: trip, error: tripError } = await db.from('trips').insert({ name, invite_token: inviteToken }).select('id, name, invite_token').single();
    if (tripError) return reply.code(500).send({ error: tripError.message });
    const bathroomRows = bathrooms.map((b, i) => ({ trip_id: trip.id, name: b.name || `Bathroom ${i + 1}`, sort_order: i }));
    const { data: insertedBathrooms, error: bathError } = await db.from('bathrooms').insert(bathroomRows).select('id');
    if (bathError) {
      await db.from('trips').delete().eq('id', trip.id);
      return reply.code(500).send({ error: bathError.message });
    }
    const queueRows = insertedBathrooms.map((b) => ({ bathroom_id: b.id, trip_id: trip.id }));
    await db.from('queues').insert(queueRows);
    const inviteLink = `${origin}/join/${trip.invite_token}`;
    return reply.send({ tripId: trip.id, inviteLink, inviteToken: trip.invite_token, name: trip.name });
  });

  // POST /trips/:tripId/join — join trip via link (body: name, phone)
  fastify.post('/trips/:tripId/join', async (request, reply) => {
    const { tripId } = request.params;
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
    const { name, bathrooms } = request.body || {};
    const { data: trip } = await db.from('trips').select('id').eq('id', tripId).single();
    if (!trip) return reply.code(404).send({ error: 'Trip not found' });
    const updates = {};
    if (name != null) updates.name = name;
    if (Object.keys(updates).length) await db.from('trips').update(updates).eq('id', tripId);
    if (Array.isArray(bathrooms) && bathrooms.length > 0) {
      const existing = await db.from('bathrooms').select('id').eq('trip_id', tripId);
      const newRows = bathrooms.map((b, i) => ({ trip_id: tripId, name: b.name || `Bathroom ${i + 1}`, sort_order: i }));
      await db.from('bathrooms').delete().eq('trip_id', tripId);
      const { data: inserted } = await db.from('bathrooms').insert(newRows).select('id');
      for (const b of inserted || []) {
        await db.from('queues').insert({ bathroom_id: b.id, trip_id: tripId });
      }
    }
    const { data: updated } = await db.from('trips').select('id, name').eq('id', tripId).single();
    return reply.send(updated);
  });
}
