import { audioProcessor } from './AudioProcessor';
import { logger } from '../lib/logger';

export class ThinkingSoundGenerator {
  private chimeBuffer: Buffer | null = null;

  constructor() {
    this.chimeBuffer = this.generatePleasantChime();
    logger.info(`[ThinkingSound] Pre-generated soft thinking chime (${this.chimeBuffer.length} bytes, 1.25s loop ready)`);
  }

  /**
   * Generates a soft, pleasant, harmonic 3-tone chime loop in 8000Hz 8-bit mono μ-law.
   * Total length: 1.25 seconds (10,000 samples).
   */
  private generatePleasantChime(): Buffer {
    const sampleRate = 8000;
    const durationSeconds = 1.25;
    const totalSamples = Math.floor(sampleRate * durationSeconds);
    const buffer = Buffer.alloc(totalSamples);

    const tone1Freq = 523.25; // C5
    const tone2Freq = 659.25; // E5
    const tone3Freq = 783.99; // G5

    const baseAmplitude = 2600; // Gentle, comfortable telephone volume (-22 dBFS)

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // Note 1: C5 starts at t = 0.0s
      if (t >= 0 && t < 0.35) {
        const env1 = Math.exp(-t * 9);
        const s1 = Math.sin(2 * Math.PI * tone1Freq * t) + 0.2 * Math.sin(2 * Math.PI * (tone1Freq * 2) * t);
        sample += baseAmplitude * env1 * s1;
      }

      // Note 2: E5 starts at t = 0.12s
      if (t >= 0.12 && t < 0.50) {
        const t2 = t - 0.12;
        const env2 = Math.exp(-t2 * 8);
        const s2 = Math.sin(2 * Math.PI * tone2Freq * t2) + 0.2 * Math.sin(2 * Math.PI * (tone2Freq * 2) * t2);
        sample += baseAmplitude * 0.9 * env2 * s2;
      }

      // Note 3: G5 starts at t = 0.24s
      if (t >= 0.24 && t < 0.65) {
        const t3 = t - 0.24;
        const env3 = Math.exp(-t3 * 7);
        const s3 = Math.sin(2 * Math.PI * tone3Freq * t3) + 0.25 * Math.sin(2 * Math.PI * (tone3Freq * 2) * t3);
        sample += baseAmplitude * 0.85 * env3 * s3;
      }

      // Clamp to 16-bit range
      const clampedSample = Math.max(-32767, Math.min(32767, Math.round(sample)));
      buffer[i] = audioProcessor.linearToMulaw(clampedSample);
    }

    return buffer;
  }

  public getChimeBuffer(): Buffer {
    if (!this.chimeBuffer) {
      this.chimeBuffer = this.generatePleasantChime();
    }
    return this.chimeBuffer;
  }
}

export const thinkingSoundGenerator = new ThinkingSoundGenerator();
