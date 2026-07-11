import { prisma } from '../../../lib/prisma';
import { cache, CacheKeys } from '../../../lib/cache';
import { ApiError } from '../../../utils/ApiError';
import type { z } from 'zod';
import type { updateOrganizationSchema, updateBusinessSettingsSchema } from './organizations.validator';

export const organizationsService = {
  async getOrganization(orgId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId, deletedAt: null },
      include: {
        businessSettings: true,
      },
    });

    if (!org) throw ApiError.notFound('Organization');
    return org;
  },

  async updateOrganization(orgId: string, data: z.infer<typeof updateOrganizationSchema>) {
    if (data.slug) {
      const existing = await prisma.organization.findUnique({ where: { slug: data.slug } });
      if (existing && existing.id !== orgId) {
        throw ApiError.conflict('Slug is already in use');
      }
    }
    if (data.domain) {
      const existing = await prisma.organization.findUnique({ where: { domain: data.domain } });
      if (existing && existing.id !== orgId) {
        throw ApiError.conflict('Domain is already mapped to another organization');
      }
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
      include: { businessSettings: true },
    });

    await cache.del(CacheKeys.org(orgId));
    return org;
  },

  async updateBusinessSettings(orgId: string, data: z.infer<typeof updateBusinessSettingsSchema>) {
    const settings = await prisma.businessSettings.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        ...data,
      },
      update: data,
    });

    await cache.del(CacheKeys.orgSettings(orgId));
    return settings;
  },

  async getStats(orgId: string) {
    // Quick high-level stats for dashboard overview
    const [employees, calls, customers, appointments] = await Promise.all([
      prisma.aIEmployee.count({ where: { organizationId: orgId, deletedAt: null } }),
      prisma.call.count({ where: { organizationId: orgId } }),
      prisma.customer.count({ where: { organizationId: orgId, deletedAt: null } }),
      prisma.appointment.count({ where: { organizationId: orgId } }),
    ]);

    return { employees, calls, customers, appointments };
  },

  async listUserOrganizations(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            planTier: true,
            isActive: true,
          }
        }
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map(m => ({
      ...m.organization,
      role: m.role,
    }));
  }
};
