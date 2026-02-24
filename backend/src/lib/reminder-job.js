import { db } from './db.js';
import { sendSms } from './sms.js';

const REMINDER_MINUTES = 30;

/**
 * Find queue_entries that are active for > REMINDER_MINUTES and haven't been reminded; send SMS and set reminder_sent_at.
 * Idempotent: reminder_sent_at prevents double-send.
 */
export async function runReminderJob() {
  const cutoff = new Date(Date.now() - REMINDER_MINUTES * 60 * 1000).toISOString();
  const { data: entries } = await db
    .from('queue_entries')
    .select('id, participant_id, queue_id')
    .eq('state', 'active')
    .lt('activated_at', cutoff)
    .is('reminder_sent_at', null);

  for (const entry of entries || []) {
    const { data: p } = await db.from('participants').select('phone').eq('id', entry.participant_id).single();
    const { data: q } = await db.from('queues').select('bathroom_id').eq('id', entry.queue_id).single();
    const { data: bath } = q ? await db.from('bathrooms').select('name').eq('id', q.bathroom_id).single() : { data: null };
    const bathroomName = bath?.name || 'bathroom';
    if (p?.phone) {
      await sendSms(p.phone, `Still using ${bathroomName}? Reply DONE when finished.`);
      await db.from('queue_entries').update({ reminder_sent_at: new Date().toISOString() }).eq('id', entry.id);
    }
  }
  return entries?.length ?? 0;
}
