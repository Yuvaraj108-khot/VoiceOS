import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from './prisma';
import { redis } from './redis';
import { logger } from './logger';

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '30', 10);
const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

export interface AccessTokenPayload {
  sub: string;    // userId
  org: string;    // organizationId
  role: string;   // MemberRole
  email: string;
  iat: number;
  exp: number;
  jti: string;    // JWT ID for blacklisting
}

/**
 * Decodes the base64-encoded RSA key from env
 */
const getPrivateKey = (): string => {
  const key = process.env.JWT_PRIVATE_KEY;
  if (!key) throw new Error('JWT_PRIVATE_KEY not configured');
  // Support both raw PEM and base64-encoded PEM
  if (key.startsWith('-----')) return key;
  return Buffer.from(key, 'base64').toString('utf-8');
};

const getPublicKey = (): string => {
  const key = process.env.JWT_PUBLIC_KEY;
  if (!key) throw new Error('JWT_PUBLIC_KEY not configured');
  if (key.startsWith('-----')) return key;
  return Buffer.from(key, 'base64').toString('utf-8');
};

export const tokenService = {
  /**
   * Signs a short-lived RS256 access token
   */
  signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp' | 'jti'>): string {
    const jti = crypto.randomBytes(16).toString('hex');
    return jwt.sign({ ...payload, jti }, getPrivateKey(), {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_TTL as any,
    });
  },

  /**
   * Verifies and decodes an access token
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, getPublicKey(), {
      algorithms: ['RS256'],
    }) as AccessTokenPayload;
  },

  /**
   * Creates a new opaque refresh token session in DB
   */
  async createRefreshToken(
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<string> {
    const raw = crypto.randomBytes(64).toString('hex');
    const expires = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

    await prisma.session.create({
      data: {
        userId,
        refreshToken: raw,
        ipAddress: ip,
        userAgent,
        expiresAt: expires,
      },
    });

    return raw;
  },

  /**
   * Rotates refresh token — revokes old, creates new.
   * Detects reuse attacks by revoking all sessions for that user.
   */
  async rotateRefreshToken(
    oldToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ userId: string; newToken: string }> {
    const session = await prisma.session.findUnique({
      where: { refreshToken: oldToken },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      // Possible token reuse attack — revoke ALL sessions for this user
      if (session) {
        logger.warn(
          { userId: session.userId },
          'Refresh token reuse detected — revoking all sessions',
        );
        await prisma.session.updateMany({
          where: { userId: session.userId },
          data: { isRevoked: true },
        });
        await redis.del(`user:sessions:${session.userId}`);
      }
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Revoke old session
    await prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Issue new session
    const newToken = await this.createRefreshToken(session.userId, ip, userAgent);
    return { userId: session.userId, newToken };
  },

  /**
   * Generates a cryptographically secure token pair (raw + sha256 hash)
   */
  generateSecureToken(): { raw: string; hashed: string } {
    const raw = crypto.randomBytes(64).toString('hex');
    const hashed = this.hashToken(raw);
    return { raw, hashed };
  },

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Blacklists an access token in Redis until it expires
   */
  async blacklistAccessToken(jti: string, expiresAt: number): Promise<void> {
    const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
    if (ttl > 0) {
      await redis.setex(`blacklist:jti:${jti}`, ttl, '1');
    }
  },

  /**
   * Checks if a token's JTI is blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const result = await redis.get(`blacklist:jti:${jti}`);
    return result === '1';
  },

  /**
   * Stores a one-time token in Redis with expiry (for email verify / password reset)
   */
  async storeOtpToken(key: string, hashedToken: string, ttlSeconds: number): Promise<void> {
    await redis.setex(`otp:${key}`, ttlSeconds, hashedToken);
  },

  /**
   * Validates and consumes a one-time token from Redis
   */
  async consumeOtpToken(key: string, rawToken: string): Promise<boolean> {
    const stored = await redis.get(`otp:${key}`);
    if (!stored) return false;
    const hashed = this.hashToken(rawToken);
    if (stored !== hashed) return false;
    await redis.del(`otp:${key}`);
    return true;
  },

  /**
   * Revokes all sessions for a user
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  },
};
