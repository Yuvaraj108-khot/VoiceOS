import { z } from 'zod';

export const createWorkflowSchema = z.object({
  employeeId: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
  variables: z.record(z.any()).optional().default({}),
  triggerConfig: z.record(z.any()).optional().default({}),
  isActive: z.boolean().default(true),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();
