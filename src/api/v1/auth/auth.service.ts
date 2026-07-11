import bcrypt from 'bcryptjs';
import { prisma } from '../../../lib/prisma';
import { tokenService } from '../../../lib/tokenService';
import { generateUniqueSlug } from '../../../utils/slugify';
import { ApiError } from '../../../utils/ApiError';
import type { z } from 'zod';
import type { registerSchema, loginSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema } from './auth.validator';

const BCRYPT_COST = 12;

export const authService = {
  async register(data: z.infer<typeof registerSchema>) {
    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw ApiError.conflict('Email already in use');
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);
    const slug = await generateUniqueSlug(data.organizationName, async (s) => {
      const existing = await prisma.organization.findUnique({ where: { slug: s } });
      return !!existing;
    });

    // Transaction: Create User + Org + TeamMember + BusinessSettings
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          slug,
        },
      });

      await tx.teamMember.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'OWNER',
        },
      });

      await tx.businessSettings.create({
        data: {
          organizationId: org.id,
          brandName: org.name,
        },
      });

      return { user, org };
    });

    // Generate email verification token (fire and forget for now, we'll queue it later)
    const { raw, hashed } = tokenService.generateSecureToken();
    await tokenService.storeOtpToken(`verify:${result.user.id}`, hashed, 86400); // 24 hours

    const accessToken = tokenService.signAccessToken({
      sub: result.user.id,
      org: result.org.id,
      role: 'OWNER',
      email: result.user.email,
    });

    const refreshToken = await tokenService.createRefreshToken(result.user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        slug: result.org.slug,
      },
    };
  },

  async login(data: z.infer<typeof loginSchema>, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          where: { isActive: true },
          include: { organization: true },
          take: 1, // Default to first active org
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw ApiError.forbidden('You do not belong to any active organizations');
    }

    if (!membership.organization.isActive) {
      throw new ApiError(403, 'Organization is suspended', 'ORG_SUSPENDED');
    }

    // Update login stats
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
      },
    });

    const accessToken = tokenService.signAccessToken({
      sub: user.id,
      org: membership.organizationId,
      role: membership.role,
      email: user.email,
    });

    const refreshToken = await tokenService.createRefreshToken(user.id, ip, userAgent);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    };
  },

  async refresh(oldToken: string, ip?: string, userAgent?: string) {
    const { userId, newToken } = await tokenService.rotateRefreshToken(oldToken, ip, userAgent);

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        memberships: { where: { isActive: true }, take: 1 },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw ApiError.unauthorized('User inactive or not in an organization');
    }

    const membership = user.memberships[0];

    const accessToken = tokenService.signAccessToken({
      sub: user.id,
      org: membership.organizationId,
      role: membership.role,
      email: user.email,
    });

    return { accessToken, refreshToken: newToken };
  },

  async logout(userId: string, jti: string, refreshToken?: string) {
    await tokenService.blacklistAccessToken(jti, Math.floor(Date.now() / 1000) + 15 * 60); // 15 min

    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken },
        data: { isRevoked: true },
      });
    }
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent return to prevent email enumeration

    const { raw, hashed } = tokenService.generateSecureToken();
    await tokenService.storeOtpToken(`reset:${user.id}`, hashed, 3600); // 1 hour

    // Note: Email sending will be implemented in the Background Jobs phase
    // console.log(`RESET TOKEN FOR ${email}: ${raw}`);
  },

  async resetPassword(token: string, data: z.infer<typeof resetPasswordSchema>) {
    // Since we don't have the userId in the payload, we'd normally either include it in the URL
    // or store a reverse map. For this scaffold, we'll assume the token was passed with userId
    // encoded or we look it up. Let's do a simple reverse lookup from Redis via SCAN (not ideal for scale)
    // Actually, best practice: the reset link includes ?userId=...&token=...
    // We'll update the route to accept userId as well, or we can encode userId in the token string.
    // For simplicity here, let's assume `token` is `userId:rawToken`.
    
    const parts = token.split(':');
    if (parts.length !== 2) throw ApiError.badRequest('Invalid token format. Expected userId:token');
    
    const [userId, rawToken] = parts;
    
    const isValid = await tokenService.consumeOtpToken(`reset:${userId}`, rawToken);
    if (!isValid) throw ApiError.badRequest('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_COST);
    
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await tokenService.revokeAllUserSessions(userId);
  },

  async verifyEmail(token: string) {
    const parts = token.split(':');
    if (parts.length !== 2) throw ApiError.badRequest('Invalid token format');
    
    const [userId, rawToken] = parts;
    const isValid = await tokenService.consumeOtpToken(`verify:${userId}`, rawToken);
    if (!isValid) throw ApiError.badRequest('Invalid or expired verification token');

    await prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  },

  async changePassword(userId: string, data: z.infer<typeof changePasswordSchema>) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw ApiError.notFound('User');

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) throw ApiError.badRequest('Incorrect current password');

    const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_COST);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    
    await tokenService.revokeAllUserSessions(userId);
  },

  async updateProfile(userId: string, data: z.infer<typeof updateProfileSchema>) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        preferredLanguage: true,
        timezone: true,
      },
    });
    return user;
  }
};
