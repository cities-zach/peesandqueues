import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalize to E.164. Returns null if invalid.
 * @param {string} input
 * @param {string} defaultCountry - e.g. 'US'
 * @returns {string|null}
 */
export function normalizePhone(input, defaultCountry = 'US') {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().replace(/\D/g, '');
  if (!trimmed.length) return null;
  const parsed = parsePhoneNumberFromString(input, defaultCountry) ?? parsePhoneNumberFromString('+' + trimmed, defaultCountry);
  return parsed?.isValid() ? parsed.format('E.164') : null;
}
