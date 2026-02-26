import { db } from '../lib/db.js';
import { checkTripAccess } from '../lib/trip-access.js';
import { joinQueue, doneQueue, leaveQueue, getQueuesForTrip } from '../lib/queue-engine.js';
import { sendSms } from '../lib/sms.js';

async function notifyTurn(participantId, bathroomName) {
  const { data: p } = await db.from('participants').select('phone').eq('id', participantId).single();
  if (p?.phone) await sendSms(p.phone, `You're up for ${bathroomName}! Reply DONE when finished.`);
}

export async function queuesRoutes(fastify) {
  // GET /trips/:tripId/queues — list queues for trip
  fastify.get('/trips/:tripId/queues', async (request, reply) => {
    const { tripId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { data: trip } = await db.from('trips').select('id').eq('id', tripId).single();
    if (!trip) return reply.code(404).send({ error: 'Trip not found' });
    const queues = await getQueuesForTrip(tripId);
    return reply.send(queues);
  });

  // POST /trips/:tripId/queues/:bathroomId/join — body: participantId
  fastify.post('/trips/:tripId/queues/:bathroomId/join', async (request, reply) => {
    const { tripId, bathroomId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { participantId } = request.body || {};
    if (!participantId) return reply.code(400).send({ error: 'participantId required' });
    const { data: participant } = await db.from('participants').select('id').eq('id', participantId).eq('trip_id', tripId).single();
    if (!participant) return reply.code(403).send({ error: 'Participant not in this trip' });
    const { data: queue } = await db.from('queues').select('id').eq('trip_id', tripId).eq('bathroom_id', bathroomId).single();
    if (!queue) return reply.code(404).send({ error: 'Queue not found' });
    const result = await joinQueue({ queueId: queue.id, participantId, sendSms: true });
    if (!result.ok) return reply.code(400).send({ error: 'Could not join queue' });
    if (result.alreadyInQueue) return reply.send({ joined: false, message: 'Already in queue' });
    if (result.nextActive) await notifyTurn(result.nextActive.participantId, result.nextActive.bathroomName || 'bathroom');
    const { data: bathroom } = await db.from('bathrooms').select('name').eq('id', bathroomId).single();
    if (result.nextActive && result.nextActive.participantId === participantId) await notifyTurn(participantId, bathroom?.name || 'bathroom');
    return reply.send({ joined: true, entry: result.entry });
  });

  // POST /trips/:tripId/queues/:bathroomId/leave — body: participantId
  fastify.post('/trips/:tripId/queues/:bathroomId/leave', async (request, reply) => {
    const { tripId, bathroomId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { participantId } = request.body || {};
    if (!participantId) return reply.code(400).send({ error: 'participantId required' });
    const { data: participant } = await db.from('participants').select('id').eq('id', participantId).eq('trip_id', tripId).single();
    if (!participant) return reply.code(403).send({ error: 'Participant not in this trip' });
    const { data: queue } = await db.from('queues').select('id').eq('trip_id', tripId).eq('bathroom_id', bathroomId).single();
    if (!queue) return reply.code(404).send({ error: 'Queue not found' });
    const result = await leaveQueue({ queueId: queue.id, participantId, sendSms: true });
    if (!result.ok) {
      if (result.reason === 'not_in_queue') return reply.code(404).send({ error: 'Not in queue' });
      if (result.reason === 'cannot_leave_active') return reply.code(400).send({ error: 'Reply DONE when finished, not leave' });
      return reply.code(400).send({ error: 'Could not leave' });
    }
    if (result.nextActive) {
      const { data: bathroom } = await db.from('bathrooms').select('name').eq('id', bathroomId).single();
      await notifyTurn(result.nextActive.participantId, bathroom?.name || 'bathroom');
    }
    return reply.send({ left: true });
  });

  // POST /trips/:tripId/queues/:bathroomId/done — body: participantId (must be current active)
  fastify.post('/trips/:tripId/queues/:bathroomId/done', async (request, reply) => {
    const { tripId, bathroomId } = request.params;
    const access = await checkTripAccess(tripId);
    if (!access.allowed) return reply.code(access.code).send({ error: access.message });
    const { participantId } = request.body || {};
    if (!participantId) return reply.code(400).send({ error: 'participantId required' });
    const { data: participant } = await db.from('participants').select('id').eq('id', participantId).eq('trip_id', tripId).single();
    if (!participant) return reply.code(403).send({ error: 'Participant not in this trip' });
    const { data: queue } = await db.from('queues').select('id').eq('trip_id', tripId).eq('bathroom_id', bathroomId).single();
    if (!queue) return reply.code(404).send({ error: 'Queue not found' });
    const result = await doneQueue({ queueId: queue.id, participantId, sendSms: true });
    if (!result.ok) {
      if (result.reason === 'not_active') return reply.code(400).send({ error: 'You are not currently using this bathroom' });
      return reply.code(400).send({ error: 'Could not mark done' });
    }
    if (result.nextActive) {
      const { data: bathroom } = await db.from('bathrooms').select('name').eq('id', bathroomId).single();
      await notifyTurn(result.nextActive.participantId, bathroom?.name || 'bathroom');
    }
    return reply.send({ done: true });
  });
}
