/**
 * Send SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
 * Lazy-load twilio to avoid requiring it when only using webhook validation.
 */
export async function sendSms(to, body) {
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
