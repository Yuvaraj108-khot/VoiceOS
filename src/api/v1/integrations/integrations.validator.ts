import { z } from 'zod';
import { IntegrationProvider } from '@prisma/client';

export const connectIntegrationSchema = z.object({
  type: z.nativeEnum(IntegrationProvider),
  config: z.record(z.any()),
  isActive: z.boolean().default(true),
});

export const updateIntegrationSchema = z.object({
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});
