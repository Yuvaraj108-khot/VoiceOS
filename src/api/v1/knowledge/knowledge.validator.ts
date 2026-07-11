import { z } from 'zod';

export const createKnowledgeDocumentSchema = z.object({
  employeeId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['PDF', 'DOCX', 'TXT', 'CSV', 'WEBSITE', 'FAQ', 'CUSTOM']),
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateKnowledgeDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  metadata: z.record(z.any()).optional(),
});
