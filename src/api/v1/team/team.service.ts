import { prisma } from '../../../lib/prisma';
import { cache, CacheKeys } from '../../../lib/cache';
import { ApiError } from '../../../utils/ApiError';
import { tokenService } from '../../../lib/tokenService';
import type { z } from 'zod';
import type { inviteMemberSchema, acceptInviteSchema } from './team.validator';
import type { MemberRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const teamService = {
  async listMembers(organizationId: string) {
    return prisma.teamMember.findMany({
      where: { organizationId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });
  },

  async getMember(organizationId: string, memberId: string) {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!member || member.organizationId !== organizationId) {
      throw ApiError.notFound('Team member');
    }

    return member;
  },

  async inviteMember(
    organizationId: string,
    invitedById: string,
    data: z.infer<typeof inviteMemberSchema>
  ) {
    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      const existingMember = await prisma.teamMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id,
          }
        }
      });

      if (existingMember && existingMember.isActive) {
        throw ApiError.conflict('User is already an active member of this organization');
      }
    }

    const { raw } = tokenService.generateSecureToken();
    // Valid for 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.teamInvite.create({
      data: {
        organizationId,
        invitedById,
        email: data.email,
        role: data.role,
        token: raw,
        expiresAt,
      }
    });

    // TODO: Send invite email via background job
    return invite;
  },

  async updateRole(organizationId: string, memberId: string, role: MemberRole) {
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== organizationId) {
      throw ApiError.notFound('Team member');
    }

    if (member.role === 'OWNER') {
      throw ApiError.badRequest('Cannot change the role of the organization owner');
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    await cache.del(CacheKeys.userMembership(updated.userId, organizationId));
    return updated;
  },

  async removeMember(organizationId: string, memberId: string) {
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== organizationId) {
      throw ApiError.notFound('Team member');
    }

    if (member.role === 'OWNER') {
      throw ApiError.badRequest('Cannot remove the organization owner');
    }

    // Soft delete member
    await prisma.teamMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    // Revoke all sessions for this user to force them out immediately if they are logged in
    await tokenService.revokeAllUserSessions(member.userId);
    await cache.del(CacheKeys.userMembership(member.userId, organizationId));
  },

  async listInvites(organizationId: string) {
    return prisma.teamInvite.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async revokeInvite(organizationId: string, inviteId: string) {
    const invite = await prisma.teamInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.organizationId !== organizationId) {
      throw ApiError.notFound('Invite');
    }
    
    await prisma.teamInvite.delete({ where: { id: inviteId } });
  },

  async acceptInvite(data: z.infer<typeof acceptInviteSchema>) {
    const invite = await prisma.teamInvite.findUnique({
      where: { token: data.token }
    });

    if (!invite) {
      throw ApiError.badRequest('Invalid invite token');
    }
    
    if (invite.acceptedAt || invite.expiresAt < new Date()) {
      throw ApiError.badRequest('Invite has expired or already been accepted');
    }

    const user = await prisma.user.findUnique({ where: { email: invite.email } });
    let finalUserId = '';

    await prisma.$transaction(async (tx) => {
      if (user) {
        // User already exists, just add them to the org
        finalUserId = user.id;
      } else {
        // Create new user
        if (!data.password || !data.firstName || !data.lastName) {
          throw ApiError.badRequest('Password, first name, and last name are required for new users');
        }

        const passwordHash = await bcrypt.hash(data.password, 12);
        const newUser = await tx.user.create({
          data: {
            email: invite.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
            isEmailVerified: true, // Invites implicitly verify email
          }
        });
        finalUserId = newUser.id;
      }

      // Upsert membership (in case they were previously removed and are being re-invited)
      await tx.teamMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invite.organizationId,
            userId: finalUserId,
          }
        },
        create: {
          organizationId: invite.organizationId,
          userId: finalUserId,
          role: invite.role,
        },
        update: {
          role: invite.role,
          isActive: true,
        }
      });

      // Mark invite as accepted
      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      });
    });

    return { success: true };
  }
};
