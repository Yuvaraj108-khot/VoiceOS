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
  convertGoogleSheetUrl(rawUrl: string): string {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    // Already an export CSV or output CSV link
    if (url.includes('format=csv') || url.includes('output=csv')) {
      return url;
    }
    // Published Google Sheet link (/spreadsheets/d/e/.../pub)
    if (url.includes('/pub')) {
      return url.includes('?') ? `${url}&output=csv` : `${url}?output=csv`;
    }
    // Google Drive share link (/file/d/<id>/view)
    const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    // Standard Google Sheet link (/spreadsheets/d/<id>/edit)
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1] && match[1] !== 'e') {
      const sheetId = match[1];
      const gidMatch = url.match(/[?&]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
    }
    return url;
  },

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
    let columns: string[] = Array.isArray(meta.columns) 
      ? meta.columns.map((c: any) => typeof c === 'string' ? c : (c.name || c.key || String(c)))
      : [];
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

    const targetUrl = (data.sourceUrl || data.url || '').trim() || undefined;
    const targetContent = data.content?.trim();

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

    // Auto-detect type
    let detectedType = (data.type || '').toUpperCase();
    if (file) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') detectedType = 'XLSX';
      else if (ext === 'csv') detectedType = 'CSV';
      else if (ext === 'pptx' || ext === 'ppt') detectedType = 'PPTX';
      else if (ext === 'docx' || ext === 'doc') detectedType = 'DOCX';
      else if (ext === 'pdf') detectedType = 'PDF';
      else if (ext === 'txt' || ext === 'md') detectedType = 'TXT';
    } else if (targetUrl && (detectedType === 'SPREADSHEET' || detectedType === 'LIVE_SHEET' || targetUrl.includes('spreadsheets') || targetUrl.includes('.csv'))) {
      detectedType = 'SPREADSHEET';
    } else if (targetUrl && (detectedType === 'WEBSITE' || targetUrl.startsWith('http'))) {
      detectedType = 'WEBSITE';
    } else if (targetContent) {
      const firstLine = targetContent.trim().split('\n')[0] || '';
      if (firstLine.includes(',') && (firstLine.includes('id') || firstLine.includes('name') || firstLine.includes('email') || firstLine.includes('phone') || firstLine.includes('status') || firstLine.includes('order') || firstLine.includes('product'))) {
        detectedType = 'CSV';
      } else {
        detectedType = 'FAQ';
      }
    }
    if (!detectedType || detectedType === 'DOCUMENT') detectedType = 'FAQ';

    const docName = (data.name || data.title || file?.originalname || 'Untitled Knowledge Source').trim();
    const docMeta = (data.metadata || {}) as Record<string, any>;
    if (data.primaryKey) {
      docMeta.primaryKey = data.primaryKey;
    }
    if (targetUrl) {
      docMeta.sourceUrl = targetUrl;
    }

    // 1. Create Knowledge Document record in PostgreSQL
    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId,
        employeeId: data.employeeId,
        name: docName,
        type: detectedType as any,
        fileUrl,
        sourceUrl: targetUrl,
        sizeBytes,
        mimeType,
        metadata: docMeta,
        status: 'PROCESSING',
      }
    });

    // 2. Process based on source type
    try {
      if ((file || targetContent) && (detectedType === 'XLSX' || detectedType === 'CSV' || detectedType === 'SPREADSHEET')) {
        // --- LOCAL SPREADSHEET OR RAW CSV PIPELINE ---
        const buffer = file ? file.buffer : Buffer.from(targetContent || '', 'utf-8');
        const filename = file ? file.originalname : `${docName}.csv`;
        const parsed = spreadsheetParser.parseBuffer(buffer, filename);
        if (data.primaryKey) parsed.primaryKey = data.primaryKey;

        if (parsed.allRows.length > 0) {
          const rowsToInsert = parsed.allRows.map((row, idx) => ({
            organizationId,
            documentId: doc.id,
            rowIndex: idx,
            data: row,
            primaryKey: String(row[parsed.primaryKey] || '').trim() || null
          }));

          const batchSize = 500;
          for (let i = 0; i < rowsToInsert.length; i += batchSize) {
            await prisma.businessDataRow.createMany({
              data: rowsToInsert.slice(i, i + batchSize)
            });
          }
        }

        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            rowCount: parsed.rowCount,
            metadata: {
              ...docMeta,
              columns: parsed.columns,
              primaryKey: parsed.primaryKey,
              previewRows: parsed.previewRows
            }
          }
        });

      } else if (detectedType === 'SPREADSHEET' && targetUrl) {
        // --- LIVE SHEET (GOOGLE SHEETS / PUBLIC CSV URL) PIPELINE ---
        logger.info(`[KNOWLEDGE] Processing Live Sheet from URL: ${targetUrl}`);
        const downloadUrl = this.convertGoogleSheetUrl(targetUrl);
        const resp = await fetch(downloadUrl);
        if (!resp.ok) {
          throw new Error(`Failed to fetch Live Sheet: HTTP ${resp.status}`);
        }
        const textSample = await resp.clone().text().catch(() => '');
        if (textSample.includes('ServiceLogin') || (textSample.includes('<html') && textSample.includes('accounts.google.com'))) {
          throw new Error("Google Sheet is not public. Please open the Google Sheet, click Share -> set 'General access' to 'Anyone with the link can view'.");
        }
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsed = spreadsheetParser.parseBuffer(buffer, `${docName}.csv`);
        if (data.primaryKey) parsed.primaryKey = data.primaryKey;

        if (parsed.allRows.length > 0) {
          const rowsToInsert = parsed.allRows.map((row, idx) => ({
            organizationId,
            documentId: doc.id,
            rowIndex: idx,
            data: row,
            primaryKey: String(row[parsed.primaryKey] || '').trim() || null
          }));

          const batchSize = 500;
          for (let i = 0; i < rowsToInsert.length; i += batchSize) {
            await prisma.businessDataRow.createMany({
              data: rowsToInsert.slice(i, i + batchSize)
            });
          }
        }

        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            rowCount: parsed.rowCount,
            metadata: {
              ...docMeta,
              columns: parsed.columns,
              primaryKey: parsed.primaryKey,
              previewRows: parsed.previewRows,
              lastSynced: new Date().toISOString()
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

        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            chunkCount: chunks.length,
            metadata: parsed.metadata
          }
        });

      } else if (detectedType === 'WEBSITE' && targetUrl) {
        // --- WEBSITE SCRAPER PIPELINE ---
        logger.info(`[KNOWLEDGE] Scraping website from URL: ${targetUrl}`);
        let pageText = '';
        let pageTitle = docName;
        try {
          const resp = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 VoiceOS/1.0' } });
          const html = await resp.text();
          const parsed = documentParser.parseHtml(html);
          pageText = parsed.text;
          if (parsed.metadata?.title) pageTitle = parsed.metadata.title;
        } catch {
          pageText = `Content from website: ${targetUrl}`;
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
            metadata: { sourceUrl: targetUrl }
          }));

          await prisma.knowledgeChunk.createMany({
            data: chunkData
          });
        }

        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            chunkCount: chunks.length,
            metadata: {
              ...docMeta,
              pageTitle,
              characterCount: pageText.length,
              lastSynced: new Date().toISOString()
            }
          }
        });

      } else if (targetContent) {
        // --- TEXT / FAQ PIPELINE ---
        logger.info(`[KNOWLEDGE] Processing raw Text/FAQ knowledge for: ${docName}`);
        const chunks = chunkingEngine.chunkText(targetContent);

        if (chunks.length > 0) {
          const chunkData = chunks.map((c, idx) => ({
            organizationId,
            employeeId: data.employeeId || '00000000-0000-0000-0000-000000000000',
            documentId: doc.id,
            content: c,
            chunkIndex: idx,
            tokenCount: Math.ceil(c.length / 4),
            pageNumber: 1,
            metadata: { source: 'text_entry' }
          }));

          await prisma.knowledgeChunk.createMany({
            data: chunkData
          });
        }

        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return await prisma.knowledgeDocument.update({
          where: { id: doc.id },
          data: {
            status: 'READY',
            chunkCount: chunks.length,
            metadata: {
              ...docMeta,
              characterCount: targetContent.length,
              previewText: targetContent.slice(0, 300)
            }
          }
        });
      }

      // Default fallback
      return doc;
    } catch (err: any) {
      logger.error(`Failed to process knowledge source ${doc.id}: ${err.message}`);
      return prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Processing failed'
        }
      });
    }
  },

  async sync(organizationId: string, id: string) {
    const doc = await prisma.knowledgeDocument.findUnique({ where: { id } });
    if (!doc || doc.organizationId !== organizationId || doc.deletedAt) {
      throw ApiError.notFound('Knowledge Document');
    }

    await prisma.knowledgeDocument.update({
      where: { id },
      data: { status: 'PROCESSING', errorMessage: null }
    });

    try {
      const sourceUrl = doc.sourceUrl || (doc.metadata as any)?.sourceUrl;

      if ((doc.type === 'SPREADSHEET' || doc.type === 'CSV' || doc.type === 'XLSX') && sourceUrl) {
        const downloadUrl = this.convertGoogleSheetUrl(sourceUrl);
        const resp = await fetch(downloadUrl);
        if (!resp.ok) {
          throw new Error(`Failed to fetch Live Sheet: HTTP ${resp.status}`);
        }
        const textSample = await resp.clone().text().catch(() => '');
        if (textSample.includes('ServiceLogin') || (textSample.includes('<html') && textSample.includes('accounts.google.com'))) {
          throw new Error("Google Sheet is not public. Please open the Google Sheet, click Share -> set 'General access' to 'Anyone with the link can view'.");
        }
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsed = spreadsheetParser.parseBuffer(buffer, `${doc.name}.csv`);

        // Delete old rows
        await prisma.businessDataRow.deleteMany({ where: { documentId: id } });

        // Insert fresh rows
        if (parsed.allRows.length > 0) {
          const rowsToInsert = parsed.allRows.map((row, idx) => ({
            organizationId,
            documentId: id,
            rowIndex: idx,
            data: row,
            primaryKey: String(row[parsed.primaryKey] || '').trim() || null
          }));

          const batchSize = 500;
          for (let i = 0; i < rowsToInsert.length; i += batchSize) {
            await prisma.businessDataRow.createMany({
              data: rowsToInsert.slice(i, i + batchSize)
            });
          }
        }

        const updated = await prisma.knowledgeDocument.update({
          where: { id },
          data: {
            status: 'READY',
            rowCount: parsed.rowCount,
            metadata: {
              ...(doc.metadata as any || {}),
              columns: parsed.columns,
              primaryKey: parsed.primaryKey,
              previewRows: parsed.previewRows,
              lastSynced: new Date().toISOString()
            }
          }
        });
        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return updated;

      } else if (doc.type === 'WEBSITE' && sourceUrl) {
        let pageText = '';
        try {
          const resp = await fetch(sourceUrl, { headers: { 'User-Agent': 'Mozilla/5.0 VoiceOS/1.0' } });
          const html = await resp.text();
          const parsed = documentParser.parseHtml(html);
          pageText = parsed.text;
        } catch (err: any) {
          throw new Error(`Failed to scrape website: ${err.message}`);
        }

        const chunks = chunkingEngine.chunkText(pageText);
        await prisma.knowledgeChunk.deleteMany({ where: { documentId: id } });

        if (chunks.length > 0) {
          const chunkData = chunks.map((c, idx) => ({
            organizationId,
            employeeId: doc.employeeId || '00000000-0000-0000-0000-000000000000',
            documentId: id,
            content: c,
            chunkIndex: idx,
            tokenCount: Math.ceil(c.length / 4),
            pageNumber: 1,
            metadata: { sourceUrl }
          }));

          await prisma.knowledgeChunk.createMany({ data: chunkData });
        }

        const updated = await prisma.knowledgeDocument.update({
          where: { id },
          data: {
            status: 'READY',
            chunkCount: chunks.length,
            metadata: {
              ...(doc.metadata as any || {}),
              characterCount: pageText.length,
              lastSynced: new Date().toISOString()
            }
          }
        });
        await cache.delPattern(`org:${organizationId}:knowledge:*`);
        return updated;
      }

      // Fallback: touch updatedAt and set READY
      const updated = await prisma.knowledgeDocument.update({
        where: { id },
        data: {
          status: 'READY',
          metadata: {
            ...(doc.metadata as any || {}),
            lastSynced: new Date().toISOString()
          }
        }
      });
      await cache.delPattern(`org:${organizationId}:knowledge:*`);
      return updated;

    } catch (err: any) {
      logger.error(`Sync error for document ${id}: ${err.message}`);
      return await prisma.knowledgeDocument.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: err.message
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
    await Promise.all([
      prisma.businessDataRow.deleteMany({ where: { documentId: id } }),
      prisma.knowledgeChunk.deleteMany({ where: { documentId: id } })
    ]);

    const deleted = await prisma.knowledgeDocument.delete({ where: { id } });
    await cache.delPattern(`org:${organizationId}:knowledge:*`);
    return deleted;
  }
};
