import { db } from './db.js';

/**
 * Join a queue. If queue has no active user, new joiner becomes active and gets notified.
 * @param {object} opts - { queueId, participantId, idempotencyKey?, sendSms }
 * @returns {{ ok: boolean, alreadyInQueue?: boolean, entry?: object, nextActive?: object }}
 */
export async function joinQueue(opts) {
  const { queueId, participantId, idempotencyKey, sendSms } = opts;

  const { data: existing } = await db.from('queue_entries').select('id, state').eq('queue_id', queueId).eq('participant_id', participantId).in('state', ['waiting', 'active']).maybeSingle();
  if (existing) {
    return { ok: true, alreadyInQueue: true, entry: existing };
  }

  const { data: queue } = await db.from('queues').select('id, bathroom_id, trip_id').eq('id', queueId).single();
  if (!queue) return { ok: false };

  const { data: maxPos } = await db.from('queue_entries').select('position').eq('queue_id', queueId).order('position', { ascending: false }).limit(1).maybeSingle();
  const nextPosition = (maxPos?.position ?? 0) + 1;

  const { data: activeEntry } = await db.from('queue_entries').select('id').eq('queue_id', queueId).eq('state', 'active').maybeSingle();
  const isFirst = !activeEntry;

  const entryPayload = {
    queue_id: queueId,
    participant_id: participantId,
    position: nextPosition,
    state: isFirst ? 'active' : 'waiting',
    activated_at: isFirst ? new Date().toISOString() : null,
    idempotency_key: idempotencyKey || null,
  };
  const { data: entry, error: insertError } = await db.from('queue_entries').insert(entryPayload).select().single();
  if (insertError) {
    if (insertError.code === '23505') return { ok: true, alreadyInQueue: true };
    return { ok: false };
  }

  if (isFirst && sendSms) {
    const nextActive = { participantId, entryId: entry.id, bathroomId: queue.bathroom_id, tripId: queue.trip_id };
    return { ok: true, entry, nextActive };
  }
  return { ok: true, entry };
}

/**
 * Mark current active as done and advance queue. Notify next person if any.
 * @param {object} opts - { queueId, participantId (must be current active), sendSms }
 */
export async function doneQueue(opts) {
  const { queueId, participantId, sendSms } = opts;

  const { data: active } = await db.from('queue_entries').select('id, participant_id').eq('queue_id', queueId).eq('state', 'active').eq('participant_id', participantId).single();
  if (!active) return { ok: false, reason: 'not_active' };

  await db.from('queue_entries').update({ state: 'done', completed_at: new Date().toISOString() }).eq('id', active.id);

  const { data: nextWaiting } = await db.from('queue_entries').select('id, participant_id').eq('queue_id', queueId).eq('state', 'waiting').order('position', { ascending: true }).limit(1).maybeSingle();

  if (nextWaiting) {
    await db.from('queue_entries').update({ state: 'active', activated_at: new Date().toISOString() }).eq('id', nextWaiting.id);
    const { data: queue } = await db.from('queues').select('bathroom_id, trip_id').eq('id', queueId).single();
    if (sendSms && queue) {
      return { ok: true, nextActive: { participantId: nextWaiting.participant_id, entryId: nextWaiting.id, bathroomId: queue.bathroom_id, tripId: queue.trip_id } };
    }
  }
  return { ok: true };
}

/**
 * Leave queue (only when waiting). May promote next waiting to active.
 * @param {object} opts - { queueId, participantId, sendSms }
 */
export async function leaveQueue(opts) {
  const { queueId, participantId, sendSms } = opts;

  const { data: entry } = await db.from('queue_entries').select('id, state').eq('queue_id', queueId).eq('participant_id', participantId).single();
  if (!entry) return { ok: false, reason: 'not_in_queue' };
  if (entry.state !== 'waiting') return { ok: false, reason: 'cannot_leave_active' };

  await db.from('queue_entries').delete().eq('id', entry.id);

  const { data: activeEntry } = await db.from('queue_entries').select('id').eq('queue_id', queueId).eq('state', 'active').maybeSingle();
  const { data: firstWaiting } = !activeEntry
    ? await db.from('queue_entries').select('id, participant_id').eq('queue_id', queueId).eq('state', 'waiting').order('position', { ascending: true }).limit(1).maybeSingle()
    : { data: null };

  if (firstWaiting && !activeEntry) {
    await db.from('queue_entries').update({ state: 'active', activated_at: new Date().toISOString() }).eq('id', firstWaiting.id);
    const { data: queue } = await db.from('queues').select('bathroom_id, trip_id').eq('id', queueId).single();
    if (sendSms && queue) {
      return { ok: true, nextActive: { participantId: firstWaiting.participant_id, entryId: firstWaiting.id, bathroomId: queue.bathroom_id, tripId: queue.trip_id } };
    }
  }
  return { ok: true };
}

/**
 * Get queue summary for a trip (per bathroom: entries with position, state, display_name).
 */
export async function getQueuesForTrip(tripId) {
  const { data: queues } = await db.from('queues').select('id, bathroom_id, trip_id').eq('trip_id', tripId);
  if (!queues?.length) return [];

  const { data: bathrooms } = await db.from('bathrooms').select('id, name, sort_order').in('id', queues.map((q) => q.bathroom_id)).order('sort_order');
  const bathroomMap = Object.fromEntries((bathrooms || []).map((b) => [b.id, b]));

  const result = [];
  for (const q of queues) {
    const { data: entries } = await db
      .from('queue_entries')
      .select('id, participant_id, position, state, joined_at, activated_at')
      .eq('queue_id', q.id)
      .in('state', ['waiting', 'active'])
      .order('position', { ascending: true });
    const participantIds = [...new Set((entries || []).map((e) => e.participant_id))];
    const { data: participants } = participantIds.length
      ? await db.from('participants').select('id, display_name').in('id', participantIds)
      : { data: [] };
    const participantMap = Object.fromEntries((participants || []).map((p) => [p.id, p]));
    result.push({
      queueId: q.id,
      bathroomId: q.bathroom_id,
      bathroomName: bathroomMap[q.bathroom_id]?.name ?? 'Bathroom',
      sortOrder: bathroomMap[q.bathroom_id]?.sort_order ?? 0,
      entries: (entries || []).map((e) => ({
        id: e.id,
        participantId: e.participant_id,
        displayName: participantMap[e.participant_id]?.display_name ?? '?',
        position: e.position,
        state: e.state,
        joinedAt: e.joined_at,
        activatedAt: e.activated_at,
      })),
    });
  }
  result.sort((a, b) => a.sortOrder - b.sortOrder);
  return result;
}
