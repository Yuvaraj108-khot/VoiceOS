import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { generatePrefixedId } from '../../../utils/generateId';
import { slugify } from '../../../utils/slugify';
import type { z } from 'zod';
import type { createEmployeeSchema, updateEmployeeSchema } from './ai-employees.validator';
import { Prisma } from '@prisma/client';
import { cache, CacheKeys } from '../../../lib/cache';

export const aiEmployeesService = {
  async list(organizationId: string, options: { page?: number; limit?: number; search?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const cacheKey = `${CacheKeys.employeeList(organizationId)}:${page}:${limit}:${options.search || ''}`;

    return cache.getOrSet(cacheKey, async () => {
      const where: Prisma.AIEmployeeWhereInput = {
        organizationId,
        deletedAt: null,
        ...(options.search && {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { role: { contains: options.search, mode: 'insensitive' } },
          ]
        })
      };

      const [items, total] = await Promise.all([
        prisma.aIEmployee.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            voiceProfile: true,
            phoneNumbers: { where: { releasedAt: null } },
            _count: {
              select: { calls: true }
            }
          }
        }),
        prisma.aIEmployee.count({ where })
      ]);

      const enrichedItems = items.map(emp => ({
        ...emp,
        callsHandled: emp._count?.calls ?? emp.callsHandled ?? 0
      }));

      return { items: enrichedItems, total, page, limit };
    }, 30);
  },

  async get(organizationId: string, id: string) {
    const employee = await prisma.aIEmployee.findUnique({
      where: { id },
      include: {
        phoneNumbers: { where: { releasedAt: null } },
        knowledgeDocuments: {
          select: { id: true, name: true, type: true, status: true }
        },
        voiceProfile: true,
        workflows: { select: { id: true, name: true, isActive: true } }
      }
    });

    if (!employee || employee.organizationId !== organizationId || employee.deletedAt) {
      throw ApiError.notFound('AI Employee');
    }

    return employee;
  },

  async create(organizationId: string, createdById: string, data: z.infer<typeof createEmployeeSchema>) {
    const created = await prisma.aIEmployee.create({
      data: {
        organizationId,
        name: data.name,
        slug: slugify(data.name) + '-' + Math.floor(Math.random() * 1000),
        role: data.role,
        status: 'ACTIVE',
        personality: 'Professional, consultative, warm, and highly knowledgeable',
        systemPrompt: data.systemPrompt || '',
        firstMessage: data.welcomeMessage,
        languages: [data.language],
        currentLanguage: data.language,
        maxCallDuration: data.maxDurationSeconds,
        voiceProfile: {
          create: {
            provider: data.voiceProvider || 'EDGE_TTS',
            voiceId: data.voiceId || 'en-US-AriaNeural',
            voiceName: data.voiceId || 'Aria (US Female)',
          }
        }
      },
      include: {
        voiceProfile: true
      }
    });

    await cache.delPattern(`${CacheKeys.employeeList(organizationId)}*`);
    return created;
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateEmployeeSchema>) {
    const existing = await prisma.aIEmployee.findUnique({ where: { id }, include: { voiceProfile: true } });
    if (!existing || existing.organizationId !== organizationId || existing.deletedAt) {
      throw ApiError.notFound('AI Employee');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.systemPrompt) updateData.systemPrompt = data.systemPrompt;
    if (data.welcomeMessage !== undefined) updateData.firstMessage = data.welcomeMessage;
    if (data.language) {
      updateData.languages = [data.language];
      updateData.currentLanguage = data.language;
    }
    if (data.status) updateData.status = data.status;
    if (data.maxDurationSeconds) updateData.maxCallDuration = data.maxDurationSeconds;

    if (data.voiceId || data.voiceProvider) {
      if (existing.voiceProfile) {
        updateData.voiceProfile = {
          update: {
            ...(data.voiceId && { voiceId: data.voiceId, voiceName: data.voiceId }),
            ...(data.voiceProvider && { provider: data.voiceProvider }),
          }
        };
      } else {
        updateData.voiceProfile = {
          create: {
            provider: data.voiceProvider || 'EDGE_TTS',
            voiceId: data.voiceId || 'en-US-AriaNeural',
            voiceName: data.voiceId || 'Aria (US Female)'
          }
        };
      }
    }

    const updated = await prisma.aIEmployee.update({
      where: { id },
      data: updateData,
      include: {
        voiceProfile: true
      }
    });

    await cache.delPattern(`${CacheKeys.employeeList(organizationId)}*`);
    return updated;
  },

  async delete(organizationId: string, id: string) {
    const existing = await prisma.aIEmployee.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId || existing.deletedAt) {
      throw ApiError.notFound('AI Employee');
    }

    // Soft delete to preserve call history references
    await prisma.aIEmployee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await cache.delPattern(`${CacheKeys.employeeList(organizationId)}*`);
  }
};
