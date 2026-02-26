import { db } from './db.js';

/**
 * Check if a trip is accessible (paid and not expired). Returns { allowed, code, message } or { allowed: true }.
 * @param {string} tripId
 * @returns {Promise<{ allowed: boolean, code?: number, message?: string }>}
 */
export async function checkTripAccess(tripId) {
  const { data: trip } = await db.from('trips').select('id, status, expires_at').eq('id', tripId).single();
  if (!trip) return { allowed: false, code: 404, message: 'Trip not found' };
  if (trip.status === 'pending') return { allowed: false, code: 402, message: 'Payment required.' };
  const now = new Date();
  const expiresAt = trip.expires_at ? new Date(trip.expires_at) : null;
  if (expiresAt && now > expiresAt) {
    await db.from('trips').update({ status: 'expired' }).eq('id', tripId);
    return { allowed: false, code: 410, message: 'This trip has expired.' };
  }
  return { allowed: true };
}
