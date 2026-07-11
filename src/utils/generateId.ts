import { customAlphabet } from 'nanoid';

// URL-safe alphabet for IDs
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 21);
const shortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

/**
 * Generates a 21-char URL-safe nanoid
 */
export const generateId = (): string => nanoid();

/**
 * Generates an 8-char short ID (for display, slugs)
 */
export const generateShortId = (): string => shortId();

/**
 * Generates a prefixed ID (e.g., "emp_abc123xyz")
 */
export const generatePrefixedId = (prefix: string): string =>
  `${prefix}_${shortId()}`;

// Resource-specific ID generators
export const ids = {
  employee: () => generatePrefixedId('emp'),
  call: () => generatePrefixedId('call'),
  workflow: () => generatePrefixedId('wf'),
  apiKey: () => generatePrefixedId('vos'),
};
