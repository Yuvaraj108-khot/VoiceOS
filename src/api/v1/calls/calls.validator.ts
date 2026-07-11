import { z } from 'zod';

export const triggerCallSchema = z.object({
  employeeId: z.string().uuid(),
  toNumber: z.string().regex(/^\+\d{1,15}$/, 'Must be in E.164 format'),
  customerId: z.string().uuid().optional(),
  variables: z.record(z.any()).optional(),
});
