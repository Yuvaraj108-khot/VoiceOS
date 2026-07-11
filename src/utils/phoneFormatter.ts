import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

/**
 * Normalizes a phone number to E.164 format
 * Returns null if the number is invalid
 */
export function toE164(phone: string, defaultCountry: CountryCode = 'US'): string | null {
  try {
    if (!isValidPhoneNumber(phone, defaultCountry)) return null;
    const parsed = parsePhoneNumber(phone, defaultCountry);
    return parsed.format('E.164');
  } catch {
    return null;
  }
}

/**
 * Formats a phone number to a human-readable format
 */
export function formatPhoneNumber(
  phone: string,
  defaultCountry: CountryCode = 'US',
): string {
  try {
    const parsed = parsePhoneNumber(phone, defaultCountry);
    return parsed.formatNational();
  } catch {
    return phone;
  }
}

/**
 * Extracts the country code from a phone number
 */
export function getCountryFromPhone(phone: string): string | undefined {
  try {
    const parsed = parsePhoneNumber(phone);
    return parsed.country;
  } catch {
    return undefined;
  }
}

/**
 * Validates that a string is a valid phone number
 */
export function isValidPhone(phone: string, country: CountryCode = 'US'): boolean {
  try {
    return isValidPhoneNumber(phone, country);
  } catch {
    return false;
  }
}
