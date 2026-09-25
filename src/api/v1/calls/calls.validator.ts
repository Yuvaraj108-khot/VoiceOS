import { z } from 'zod';

export const triggerCallSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  toNumber: z.string().transform(val => {
    const digits = val.replace(/\D/g, '');
    return val.trim().startsWith('+') ? '+' + digits : '+' + digits;
  }).pipe(z.string().regex(/^\+\d{7,15}$/, 'Must be in valid E.164 format (e.g. +919108796105)')),
  customerId: z.string().uuid().optional(),
  variables: z.record(z.any()).optional(),
});


