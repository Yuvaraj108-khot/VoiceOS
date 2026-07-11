import { z } from 'zod';

export const createAppointmentSchema = z.object({
  customerId: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW']).optional(),
});
