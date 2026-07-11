import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/).optional().or(z.literal('')),
  timezone: z.string().optional(),
  country: z.string().length(2).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/).optional(),
});

export const updateBusinessSettingsSchema = z.object({
  brandName: z.string().optional(),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  supportEmail: z.string().email().optional().or(z.literal('')),
  supportPhone: z.string().optional().or(z.literal('')),
  businessHours: z.record(z.any()).optional(),
  callRecordingEnabled: z.boolean().optional(),
  transcriptionEnabled: z.boolean().optional(),
  sentimentAnalysis: z.boolean().optional(),
  autoSummary: z.boolean().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookSecret: z.string().optional().or(z.literal('')),
  slackWebhookUrl: z.string().url().optional().or(z.literal('')),
  defaultLanguage: z.string().length(2).optional(),
  callbackEnabled: z.boolean().optional(),
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
});
