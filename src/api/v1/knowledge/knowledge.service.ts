import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { s3Service } from '../../../lib/s3';
import type { z } from 'zod';
import type { createKnowledgeDocumentSchema, updateKnowledgeDocumentSchema } from './knowledge.validator';
import { Prisma } from '@prisma/client';
import { generatePrefixedId } from '../../../utils/generateId';

export const knowledgeService = {
  async list(organizationId: string, options: { employeeId?: string; page?: number; limit?: number; search?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.KnowledgeDocumentWhereInput = {
      organizationId,
      ...(options.employeeId && { employeeId: options.employeeId }),
      ...(options.search && {
        name: { contains: options.search, mode: 'insensitive' }
      })
    };

    const [items, total] = await Promise.all([
      prisma.knowledgeDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.knowledgeDocument.count({ where })
    ]);

    return { items, total, page, limit };
  },

  async get(organizationId: string, id: string) {
    const doc = await prisma.knowledgeDocument.findUnique({
      where: { id },
      include: { employee: { select: { id: true, name: true } } }
    });

    if (!doc || doc.organizationId !== organizationId) {
      throw ApiError.notFound('Knowledge Document');
    }

    return doc;
  },

  async create(organizationId: string, data: z.infer<typeof createKnowledgeDocumentSchema>, file?: Express.Multer.File) {
    // Validate Employee exists
    const employee = await prisma.aIEmployee.findUnique({ where: { id: data.employeeId } });
    if (!employee || employee.organizationId !== organizationId) {
      throw ApiError.notFound('AI Employee');
    }

    let fileUrl = undefined;
    let sizeBytes = undefined;
    let mimeType = undefined;

    if (file) {
      const { randomUUID } = require('crypto');
      const fileId = randomUUID();
      const key = s3Service.documentKey(organizationId, data.employeeId, `${fileId}-${file.originalname}`);
      fileUrl = await s3Service.upload(key, file.buffer, { ContentType: file.mimetype });
      sizeBytes = file.size;
      mimeType = file.mimetype;
    }

    return prisma.knowledgeDocument.create({
      data: {
        id: generatePrefixedId('doc'),
        organizationId,
        employeeId: data.employeeId,
        name: data.name,
        type: data.type,
        fileUrl,
        sourceUrl: data.sourceUrl,
        sizeBytes,
        mimeType,
        metadata: data.metadata || {},
        status: 'PENDING', // Ready for BullMQ worker to process
      }
    });
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateKnowledgeDocumentSchema>) {
    const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc || doc.organizationId !== organizationId) {
      throw ApiError.notFound('Knowledge Document');
    }

    return prisma.knowledgeDocument.update({
      where: { id },
      data,
    });
  },

  async delete(organizationId: string, id: string) {
    const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc || doc.organizationId !== organizationId) {
      throw ApiError.notFound('Knowledge Document');
    }

    // TODO: Delete chunks, remove from Vector DB, delete from S3
    await prisma.knowledgeDocument.delete({ where: { id } });
  }
};
