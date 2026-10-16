import { prisma } from '../../../lib/prisma';
import { ApiError } from '../../../utils/ApiError';
import { s3Service } from '../../../lib/s3';
import type { z } from 'zod';
import type { createKnowledgeDocumentSchema, updateKnowledgeDocumentSchema } from './knowledge.validator';
import { Prisma } from '@prisma/client';
import { spreadsheetParser } from '../../../knowledge/SpreadsheetParser';
import { documentParser } from '../../../knowledge/DocumentParser';
import { chunkingEngine } from '../../../knowledge/ChunkingEngine';
import { logger } from '../../../lib/logger';
import { cache } from '../../../lib/cache';

export const knowledgeService = {
  async list(organizationId: string, options: { employeeId?: string; page?: number; limit?: number; search?: string; type?: string } = {}) {
    const cacheKey = `org:${organizationId}:knowledge:list:${JSON.stringify(options)}`;
    return cache.getOrSet(cacheKey, async () => {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;

      const where: Prisma.KnowledgeDocumentWhereInput = {
        organizationId,
        deletedAt: null,
        ...(options.employeeId && { employeeId: options.employeeId }),
        ...(options.type && { type: options.type as any }),
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
    }, 30);
  },

  async get(organizationId: string, id: string) {
    const doc = await prisma.knowledgeDocument.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, name: true } },
        _count: { select: { chunks: true, dataRows: true } }
      }
    });

    if (!doc || doc.organizationId !== organizationId || doc.deletedAt) {
      throw ApiError.notFound('Knowledge Document');
    }

    return doc;
  },

  async getRows(organizationId: string, id: string, limit: number = 20) {
    const doc = await this.get(organizationId, id);
    const rows = await prisma.businessDataRow.findMany({
      where: { documentId: id, organizationId },
      take: limit,
      orderBy: { rowIndex: 'asc' }
    });

    const meta = (doc.metadata as any) || {};
    const parsedRows = rows.map(r => (typeof r.data === 'string' ? JSON.parse(r.data as string) : r.data));
    let columns: string[] = Array.isArray(meta.columns) ? meta.columns : [];
    if (columns.length === 0 && parsedRows.length > 0 && parsedRows[0]) {
      columns = Object.keys(parsedRows[0]);
    }

    return {
      columns,
      rows: parsedRows,
      totalRows: doc.rowCount || rows.length,
      primaryKey: meta.primaryKey || 'id'
    };
  },

  async create(organizationId: string, data: z.infer<typeof createKnowledgeDocumentSchema>, file?: Express.Multer.File) {
    // If employeeId provided, verify it belongs to this organization
    if (data.employeeId) {
      const employee = await prisma.aIEmployee.findUnique({ where: { id: data.employeeId } });
      if (!employee || employee.organizationId !== organizationId) {
        throw ApiError.notFound('AI Employee');
      }
    }

    let fileUrl = undefined;
    let sizeBytes = undefined;
    let mimeType = undefined;

    if (file) {
      sizeBytes = file.size;
      mimeType = file.mimetype;
      try {
        const { randomUUID } = require('crypto');
        const fileId = randomUUID();
        const key = s3Service.documentKey(organizationId, data.employeeId || 'shared', `${fileId}-${file.originalname}`);
        fileUrl = await s3Service.upload(key, file.buffer, { ContentType: file.mimetype });
      } catch (err) {
        logger.warn(`S3 upload skipped, processing locally: ${err}`);
      }
    }

    // Auto-detect type from file extension if needed
    let detectedType = (data.type || '').toUpperCase();
    if (file) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') detectedType = 'XLSX';
      else if (ext === 'csv') detectedType = 'CSV';
      else if (ext === 'pptx' || ext === 'ppt') detectedType = 'PPTX';
      else if (ext === 'docx' || ext === 'doc') detectedType = 'DOCX';
      else if (ext === 'pdf') detectedType = 'PDF';
      else if (ext === 'txt' || ext === 'md') detectedType = 'TXT';
    }
    if (!detectedType) detectedType = 'DOCUMENT';

    const docName = (data.name || data.title || file?.originalname || 'Untitled Document').trim();
    const docMeta = (data.metadata || {}) as Record<string, any>;
    if (data.primaryKey) {
      docMeta.primaryKey = data.primaryKey;
    }

    // 1. Create Knowledge Document record in PostgreSQL
    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId,
        employeeId: data.employeeId,
        name: docName,
        type: detectedType as any,
        fileUrl,
        sourceUrl: data.sourceUrl,
        sizeBytes,
        mimeType,
        metadata: docMeta,
        status: 'PROCESSING',
      }
    });

    // 2. Process based on whether it is a Structured Spreadsheet vs Document vs Website
    try {
      if (file && (detectedType === 'XLSX' || detectedType === 'CSV' || detectedType === 'SPREADSHEET')) {
        // --- SPREADSHEET PIPELINE ---
        const parsed = spreadsheetParser.parseBuffer(file.buffer, file.originalname);

        // Batch insert structured rows into BusinessDataRow
        if (parsed.allRows.length > 0) {
          const rowsToInsert = parsed.allRows.map((row, idx) => ({
            organizationId,
            documentId: doc.id,
            rowIndex: idx,
            data: row,
            primaryKey: String(row[parsed.primaryKey] || '').trim() || null
          }));

          // Chunk insertions in batches of 500 for high performance
          const batchSize = 500;
          for (let i = 0; i < rowsToInsert.length; i += batchSize) {
            await prisma.businessDataRow.createMany({
              data: rowsToInsert.slice(i, i + batchSize)
            });
          }
        }

        // Update document metadata with columns, row count, primaryKey, and preview
        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            rowCount: parsed.rowCount,
            metadata: {
              columns: parsed.columns,
              primaryKey: parsed.primaryKey,
              previewRows: parsed.previewRows
            }
          }
        });
      } else if (file) {
        // --- DOCUMENT PIPELINE (PDF, PPTX, DOCX, TXT) ---
        const parsed = await documentParser.parseBuffer(file.buffer, file.originalname, file.mimetype);
        const chunks = chunkingEngine.chunkText(parsed.text);

        if (chunks.length > 0) {
          const chunkData = chunks.map((c, idx) => ({
            organizationId,
            employeeId: data.employeeId || '00000000-0000-0000-0000-000000000000',
            documentId: doc.id,
            content: c,
            chunkIndex: idx,
            tokenCount: Math.ceil(c.length / 4),
            pageNumber: idx + 1,
            metadata: {}
          }));

          await prisma.knowledgeChunk.createMany({
            data: chunkData
          });
        }

        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            chunkCount: chunks.length,
            metadata: parsed.metadata
          }
        });
      } else if (data.sourceUrl) {
        // --- WEBSITE SCRAPER PIPELINE ---
        let pageText = '';
        try {
          const resp = await fetch(data.sourceUrl);
          const html = await resp.text();
          const parsed = documentParser.parseHtml(html);
          pageText = parsed.text;
        } catch {
          pageText = `Content scraped from website ${data.sourceUrl}.`;
        }

        const chunks = chunkingEngine.chunkText(pageText);
        if (chunks.length > 0) {
          const chunkData = chunks.map((c, idx) => ({
            organizationId,
            employeeId: data.employeeId || '00000000-0000-0000-0000-000000000000',
            documentId: doc.id,
            content: c,
            chunkIndex: idx,
            tokenCount: Math.ceil(c.length / 4),
            pageNumber: 1,
            metadata: { sourceUrl: data.sourceUrl }
          }));

          await prisma.knowledgeChunk.createMany({
            data: chunkData
          });
        }

        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            chunkCount: chunks.length
          }
        });
      }

      return doc;
    } catch (err: any) {
      logger.error(`Failed to process knowledge source ${doc.id}: ${err}`);
      return prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Processing failed'
        }
      });
    }
  },

  async update(organizationId: string, id: string, data: z.infer<typeof updateKnowledgeDocumentSchema>) {
    const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc || doc.organizationId !== organizationId || doc.deletedAt) {
      throw ApiError.notFound('Knowledge Document');
    }

    const updated = await prisma.knowledgeDocument.update({
      where: { id },
      data,
    });
    await cache.delPattern(`org:${organizationId}:knowledge:*`);
    return updated;
  },

  async delete(organizationId: string, id: string) {
    const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc || doc.organizationId !== organizationId) {
      throw ApiError.notFound('Knowledge Document');
    }

    // Cascade delete rows and chunks
    await prisma.$transaction([
      prisma.businessDataRow.deleteMany({ where: { documentId: id } }),
      prisma.knowledgeChunk.deleteMany({ where: { documentId: id } }),
      prisma.knowledgeDocument.delete({ where: { id } })
    ]);
    await cache.delPattern(`org:${organizationId}:knowledge:*`);
  }
};
