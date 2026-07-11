import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']).default('AGENT'),
});

export const updateRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER']),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Invite token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
