import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_VERSION: z.string().default('v1'),
  APP_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.string().optional(),

  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(30),

  ENCRYPTION_KEY: z.string().min(32),
  ENCRYPTION_IV_LENGTH: z.coerce.number().default(16),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_API_KEY: z.string().optional(),
  TWILIO_API_SECRET: z.string().optional(),
  TWILIO_WEBHOOK_BASE_URL: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama3-70b-8192'),
  GROQ_MAX_TOKENS: z.coerce.number().default(2048),
  GROQ_TEMPERATURE: z.coerce.number().default(0.7),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_EMBEDDING_DIMENSIONS: z.coerce.number().default(1536),

  DEEPGRAM_API_KEY: z.string().optional(),
  DEEPGRAM_MODEL: z.string().default('nova-2'),

  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_DEFAULT_VOICE_ID: z.string().default('21m00Tcm4TlvDq8ikWAM'),
  ELEVENLABS_MODEL_ID: z.string().default('eleven_turbo_v2_5'),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_STARTER_PRICE_ID: z.string().optional(),
  STRIPE_GROWTH_PRICE_ID: z.string().optional(),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default('noreply@voiceos.ai'),
  SENDGRID_FROM_NAME: z.string().default('VoiceOS'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),

  BULLMQ_PREFIX: z.string().default('voiceos'),
  BULLMQ_MAX_RETRIES: z.coerce.number().default(3),

  LOG_LEVEL: z.string().default('info'),
  LOG_PRETTY: z.string().default('false'),

  ENABLE_CALL_RECORDING: z.string().default('true'),
  ENABLE_TRANSCRIPTION: z.string().default('true'),
  ENABLE_SENTIMENT_ANALYSIS: z.string().default('true'),
  ENABLE_AUTO_SUMMARY: z.string().default('true'),
  MAX_CONCURRENT_CALLS: z.coerce.number().default(50),
  MAX_CALL_DURATION_SECONDS: z.coerce.number().default(3600),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  // In test/dev environments without all keys, warn instead of crash
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const config = parsed.success
  ? parsed.data
  : (process.env as any);

export type AppConfig = z.infer<typeof envSchema>;

// Derived helpers
export const isDev = config.NODE_ENV === 'development';
export const isProd = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

export const corsOrigins = config.CORS_ORIGINS
  ? config.CORS_ORIGINS.split(',').map((o: string) => o.trim())
  : ['http://localhost:3000'];
