import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';

export const settingsService = {
  async getUnifiedSettings(userId: string, organizationId: string) {
    const [user, member, org] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          avatarUrl: true,
          preferredLanguage: true,
          timezone: true,
          notifyEmail: true,
          notifyPush: true,
        }
      }),
      prisma.teamMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId,
          }
        }
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        include: { businessSettings: true }
      })
    ]);

    if (!user || !member || !org) {
      throw ApiError.notFound('Settings could not be resolved');
    }

    return {
      profile: user,
      membership: { role: member.role, joinedAt: member.joinedAt },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        planTier: org.planTier,
        businessSettings: org.businessSettings,
      }
    };
  }
};
