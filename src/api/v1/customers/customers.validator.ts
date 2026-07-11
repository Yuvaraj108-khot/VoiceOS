import { z } from 'zod';

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().regex(/^\+\d{1,15}$/, 'Must be in E.164 format'),
  email: z.string().email().optional().or(z.literal('')),
  company: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
