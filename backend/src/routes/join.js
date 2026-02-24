import { db } from '../lib/db.js';

export async function joinRoutes(fastify) {
  // GET /join/:token — resolve token to trip info (no PII)
  fastify.get('/join/:token', async (request, reply) => {
    const { token } = request.params;
    const { data: trip } = await db.from('trips').select('id, name').eq('invite_token', token).single();
    if (!trip) return reply.code(404).send({ error: 'Invite link invalid or expired' });
    const { data: bathrooms } = await db.from('bathrooms').select('id, name, sort_order').eq('trip_id', trip.id).order('sort_order');
    return reply.send({
      tripId: trip.id,
      tripName: trip.name,
      bathrooms: bathrooms || [],
    });
  });
}
