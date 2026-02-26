import { db } from './db.js';

/**
 * Send SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
 * Lazy-load twilio to avoid requiring it when only using webhook validation.
 * If opts.participantId is provided, skips sending when that participant has opted out (sms_opt_out).
 * @param {string} to - E.164 phone number
 * @param {string} body - Message text
 * @param {{ participantId?: string }} [opts] - Optional; participantId to respect sms_opt_out
 */
export async function sendSms(to, body, opts = {}) {
  const { participantId } = opts;
  if (participantId) {
    const { data: p } = await db.from('participants').select('sms_opt_out').eq('id', participantId).single();
    if (p?.sms_opt_out) return null;
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) {
    console.error('Twilio env not set; skipping send');
    return null;
  }
  const { default: twilio } = await import('twilio');
  const client = twilio(accountSid, authToken);
  const message = await client.messages.create({ to, from, body });
  return message.sid;
}
