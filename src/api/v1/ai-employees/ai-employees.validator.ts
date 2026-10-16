import { z } from 'zod';

export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role description is required'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  welcomeMessage: z.string().optional(),
  language: z.string().default('en'),
  voiceId: z.string().optional(),
  voiceProvider: z.enum(['ELEVENLABS', 'DEEPGRAM', 'PLAYHT', 'AZURE', 'EDGE_TTS']).or(z.string()).default('EDGE_TTS'),
  voiceSettings: z.record(z.any()).optional(),
  llmModel: z.string().default('llama3-70b-8192'),
  temperature: z.number().min(0).max(1).default(0.7),
  maxDurationSeconds: z.number().min(60).max(7200).default(3600),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', 'PAUSED']).optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();
