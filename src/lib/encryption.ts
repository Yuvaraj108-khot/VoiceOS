import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = parseInt(process.env.ENCRYPTION_IV_LENGTH ?? '16', 10);

const getKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not configured');
  // Accept hex string (32 bytes = 64 hex chars) or raw 32-byte string
  if (key.length === 64) return Buffer.from(key, 'hex');
  const buf = Buffer.from(key);
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes');
  return buf;
};

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

/**
 * Encrypts arbitrary data using AES-256-GCM.
 * Returns a JSON-serializable object containing iv, auth tag, and ciphertext.
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload.
 */
export function decrypt(payload: EncryptedPayload): string {
  const key = getKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const data = Buffer.from(payload.data, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/**
 * Encrypts a JSON object. Returns a compact base64 string for DB storage.
 */
export function encryptObject(obj: Record<string, unknown>): string {
  const payload = encrypt(JSON.stringify(obj));
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decrypts a base64-encoded encrypted JSON object.
 */
export function decryptObject<T = Record<string, unknown>>(encoded: string): T {
  const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as EncryptedPayload;
  return JSON.parse(decrypt(payload)) as T;
}

/**
 * Generate a random hex string of given byte length (default 32 bytes = 256 bits)
 */
export function generateSecret(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
