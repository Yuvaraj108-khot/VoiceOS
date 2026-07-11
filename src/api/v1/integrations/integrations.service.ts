import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { encryptObject, decryptObject } from '../../../lib/encryption';
import type { z } from 'zod';
import type { connectIntegrationSchema, updateIntegrationSchema } from './integrations.validator';

export const integrationsService = {
  async list(organizationId: string) {
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
    });
    
    // Do not return raw encrypted credentials in list view
    return integrations.map(int => ({
      id: int.id,
      provider: int.provider,
      isActive: int.isActive,
      createdAt: int.createdAt,
      updatedAt: int.updatedAt,
    }));
  },

  async get(organizationId: string, id: string) {
    const integration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!integration || integration.organizationId !== organizationId) {
      throw ApiError.notFound('Integration');
    }

    // Decrypt config before returning (Note: in production you may want to mask tokens here)
    if (integration.config) {
      integration.config = decryptObject(integration.config as string);
    }

    return integration;
  },

  async connect(organizationId: string, data: z.infer<typeof connectIntegrationSchema>) {
    // Check if integration type already exists for this org
    const existing = await prisma.integration.findFirst({
      where: { organizationId, provider: data.type },
    });

    if (existing) {
      throw ApiError.conflict(`${data.type} integration is already connected.`);
    }

    // Encrypt sensitive configuration
    const encryptedConfig = encryptObject(data.config);

    return prisma.integration.create({
      data: {
        organizationId,
        provider: data.type,
        config: encryptedConfig,
        isActive: data.isActive,
      },
      select: { id: true, provider: true, isActive: true } // Don't return config immediately
    });
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateIntegrationSchema>) {
    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId) {
      throw ApiError.notFound('Integration');
    }

    let config = existing.config;
    if (data.config) {
      // Merge with existing config
      const existingDecrypted = existing.config ? decryptObject(existing.config as string) : {};
      const mergedConfig = { ...(existingDecrypted as Record<string, unknown>), ...data.config };
      config = encryptObject(mergedConfig);
    }

    return prisma.integration.update({
      where: { id },
      data: {
        ...(data.config && { config: config as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: { id: true, provider: true, isActive: true }
    });
  },

  async disconnect(organizationId: string, id: string) {
    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== organizationId) {
      throw ApiError.notFound('Integration');
    }

    await prisma.integration.delete({ where: { id } });
  }
};
