import { z } from 'zod';

export const createKnowledgeDocumentSchema = z.object({
  employeeId: z.string().uuid().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  sourceUrl: z.string().optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  primaryKey: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateKnowledgeDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'READY', 'FAILED']).optional()
});
