import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';

export const adminService = {
  async getSystemStats() {
    const [
      totalUsers,
      totalOrgs,
      activeCalls,
      totalCalls,
      totalEmployees,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.call.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.call.count(),
      prisma.aIEmployee.count(),
    ]);

    return {
      totalUsers,
      totalOrgs,
      activeCalls,
      totalCalls,
      totalEmployees,
    };
  },

  async listOrganizations(options: { page?: number; limit?: number; search?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where = options.search
      ? { name: { contains: options.search, mode: 'insensitive' as any } }
      : {};

    const [items, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async suspendOrganization(organizationId: string) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { isActive: false },
    });
  },

  async unsuspendOrganization(organizationId: string) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { isActive: true },
    });
  }
};
