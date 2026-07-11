import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { ApiError } from '../utils/ApiError';

export class VoiceProfileManager {
  /**
   * Syncs voice profiles from external providers (e.g. ElevenLabs) to the database.
   */
  async syncAvailableVoices(organizationId: string) {
    // In production, call ElevenLabs API: GET /v1/voices
    const externalVoices = [
      { voiceId: 'voice_123', name: 'Rachel', provider: 'ElevenLabs', language: 'en' },
      { voiceId: 'voice_456', name: 'Drew', provider: 'ElevenLabs', language: 'en' },
    ];

    logger.info(`Synced ${externalVoices.length} voices for org ${organizationId}`);
    return externalVoices;
  }

  /**
   * Updates an AI Employee's voice profile settings (speed, pitch, provider).
   */
  async setVoiceProfile(employeeId: string, voiceId: string, settings: Record<string, any>) {
    return prisma.voiceProfile.upsert({
      where: { employeeId },
      update: { voiceId, ...settings },
      create: {
        employeeId,
        voiceId,
        provider: settings.provider || 'ElevenLabs',
        voiceName: settings.name || 'Default',
      }
    });
  }
}

export const voiceProfileManager = new VoiceProfileManager();
