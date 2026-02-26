import { db } from '../lib/db.js';
import { normalizePhone } from '../lib/phone.js';
import { joinQueue, doneQueue, leaveQueue, getQueuesForTrip } from '../lib/queue-engine.js';
import { sendSms } from '../lib/sms.js';
import twilio from 'twilio';

const HELP_TEXT = `Pees & Queues commands:
JOIN - join bathroom queue (if multiple: JOIN Main or 1)
DONE - you're finished, next person is notified
STATUS - see your position in each queue
HELP - this message`;

function twiML(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function twilioWebhook(fastify) {
  fastify.post('/webhooks/twilio/sms', async (request, reply) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const signature = request.headers['x-twilio-signature'];
      const url = `${process.env.PUBLIC_ORIGIN || request.protocol + '://' + request.hostname}${request.url}`;
      const params = request.body || {};
      if (!twilio.validateRequest(authToken, signature, url, params)) {
        return reply.code(403).send('Forbidden');
      }
    }

    const body = (request.body?.Body || '').trim();
    const from = request.body?.From || '';
    const messageSid = request.body?.MessageSid;

    if (!messageSid) return reply.code(400).send('Missing MessageSid');
    const phone = normalizePhone(from);
    if (!phone) {
      return reply.type('text/xml').send(twiML("We couldn't recognize your phone number. Use the invite link from your host."));
    }

    const { data: existingLog } = await db.from('sms_log').select('id, response_body').eq('twilio_sid', messageSid).maybeSingle();
    if (existingLog) {
      return reply.type('text/xml').send(existingLog.response_body || twiML('OK'));
    }

    const { data: participant } = await db.from('participants').select('id, trip_id, display_name').eq('phone', phone).order('joined_at', { ascending: false }).limit(1).maybeSingle();
    if (!participant) {
      const response = twiML("You're not in a trip. Use the invite link from your host to join.");
      await db.from('sms_log').insert({ twilio_sid: messageSid, direction: 'in', body: body?.slice(0, 500), response_body: response }).select().single();
      return reply.type('text/xml').send(response);
    }

    const tripId = participant.trip_id;
    const cmd = body.toUpperCase().trim();
    let responseText = '';

    const optOutCommands = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    if (optOutCommands.includes(cmd)) {
      await db.from('participants').update({ sms_opt_out: true }).eq('id', participant.id);
      responseText = "You've been unsubscribed. You won't receive further messages for this trip. Rejoin via your host's invite link to get messages again.";
      const response = twiML(responseText);
      await db.from('sms_log').insert({
        twilio_sid: messageSid,
        trip_id: tripId,
        participant_id: participant.id,
        direction: 'in',
        body: body?.slice(0, 500),
        response_body: response,
      });
      return reply.type('text/xml').send(response);
    }

    if (cmd === 'HELP' || cmd === '') {
      responseText = HELP_TEXT;
    } else if (cmd === 'STATUS') {
      const queues = await getQueuesForTrip(tripId);
      const lines = queues.map((q) => {
        const myEntry = q.entries.find((e) => e.participantId === participant.id);
        if (!myEntry) return `${q.bathroomName}: not in queue`;
        if (myEntry.state === 'active') return `${q.bathroomName}: you're up!`;
        const pos = q.entries.filter((e) => e.state === 'waiting' && e.position <= myEntry.position).length;
        return `${q.bathroomName}: #${pos} in line`;
      });
      responseText = lines.length ? lines.join('\n') : 'No queues yet.';
    } else if (cmd === 'DONE') {
      const { data: activeEntry } = await db.from('queue_entries').select('queue_id').eq('participant_id', participant.id).eq('state', 'active').maybeSingle();
      if (!activeEntry) {
        responseText = "You're not currently in a bathroom. Reply JOIN to get in line.";
      } else {
        const { data: bathroom } = await db.from('queues').select('bathroom_id').eq('id', activeEntry.queue_id).single();
        const { data: bath } = bathroom ? await db.from('bathrooms').select('name').eq('id', bathroom.bathroom_id).single() : { data: null };
        const result = await doneQueue({ queueId: activeEntry.queue_id, participantId: participant.id, sendSms: true });
        responseText = 'Done! Next person notified.';
        if (result.nextActive) {
          const { data: p } = await db.from('participants').select('phone').eq('id', result.nextActive.participantId).single();
          if (p?.phone) await sendSms(p.phone, `You're up for ${bath?.name || 'bathroom'}! Reply DONE when finished.`, { participantId: result.nextActive.participantId });
        }
      }
    } else if (cmd.startsWith('JOIN')) {
      const { data: queues } = await db.from('queues').select('id, bathroom_id').eq('trip_id', tripId);
      const { data: bathrooms } = await db.from('bathrooms').select('id, name, sort_order').in('id', queues?.map((q) => q.bathroom_id) || []).order('sort_order');
      const rest = cmd.slice(4).trim();
      let queueId = null;
      if (!queues?.length) {
        responseText = 'No bathrooms set up for this trip.';
      } else if (queues.length === 1) {
        queueId = queues[0].id;
      } else if (rest) {
        const byName = bathrooms?.find((b) => b.name.toLowerCase() === rest.toLowerCase());
        const byNum = /^(\d+)$/.exec(rest);
        if (byName) queueId = queues.find((q) => q.bathroom_id === byName.id)?.id;
        else if (byNum) queueId = queues[Number(byNum[1]) - 1]?.id;
      }
      if (!queueId && queues?.length > 1) {
        const list = (bathrooms || []).map((b, i) => `${i + 1}. ${b.name}`).join(', ');
        responseText = `Which bathroom? Reply JOIN then name or number:\n${list}`;
      } else if (queueId) {
        const result = await joinQueue({ queueId, participantId: participant.id, idempotencyKey: messageSid, sendSms: true });
        if (result.alreadyInQueue) {
          responseText = 'Already in that queue.';
        } else if (result.nextActive) {
          const { data: bath } = await db.from('queues').select('bathroom_id').eq('id', queueId).single();
          const { data: b } = bath ? await db.from('bathrooms').select('name').eq('id', bath.bathroom_id).single() : { data: null };
          if (result.nextActive.participantId === participant.id) {
            responseText = `You're up for ${b?.name || 'bathroom'}! Reply DONE when finished.`;
          } else {
            responseText = `You're in line for ${b?.name || 'bathroom'}. We'll text when it's your turn.`;
            const { data: p } = await db.from('participants').select('phone').eq('id', result.nextActive.participantId).single();
            if (p?.phone) await sendSms(p.phone, `You're up for ${b?.name || 'bathroom'}! Reply DONE when finished.`, { participantId: result.nextActive.participantId });
          }
        } else {
          const { data: b } = await db.from('queues').select('bathroom_id').eq('id', queueId).single();
          const { data: bn } = b ? await db.from('bathrooms').select('name').eq('id', b.bathroom_id).single() : { data: null };
          responseText = `You're in line for ${bn?.name || 'bathroom'}. We'll text when it's your turn.`;
        }
      }
    } else {
      responseText = `Unknown command. Reply HELP for commands.`;
    }

    const response = twiML(responseText || 'OK');
    await db.from('sms_log').insert({
      twilio_sid: messageSid,
      trip_id: tripId,
      participant_id: participant.id,
      direction: 'in',
      body: body?.slice(0, 500),
      response_body: response,
    });
    return reply.type('text/xml').send(response);
  });
}
