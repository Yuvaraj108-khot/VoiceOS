import { logger } from '../lib/logger';
import { groq } from '../lib/groq';
import { toFile } from 'groq-sdk';
import { audioProcessor } from './AudioProcessor';

const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL ?? 'whisper-large-v3-turbo';
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_LANGUAGE ?? 'en';

export class SpeechToText {
  /**
   * Transcribes a raw 8000Hz μ-law buffer from Twilio by converting it to WAV first.
   */
  async transcribeMulawBuffer(mulawBuffer: Buffer): Promise<string> {
    try {
      if (!mulawBuffer || mulawBuffer.length < 800) {
        // Less than 100ms of audio, skip
        return '';
      }
      const tFfmpeg = Date.now();
      const wavBuffer = await audioProcessor.mulawToWav(mulawBuffer);
      const ffmpegMs = Date.now() - tFfmpeg;

      const tGroq = Date.now();
      const text = await this.transcribeBuffer(wavBuffer, 'audio/wav');
      const groqMs = Date.now() - tGroq;

      logger.info(`[STT-PROFILE] ffmpeg_wav: ${ffmpegMs}ms | groq_whisper: ${groqMs}ms | total_stt: ${Date.now() - tFfmpeg}ms`);
      return text;
    } catch (error: any) {
      logger.error(`[STT] Error transcribing mulaw buffer: ${error.message}`);
      return '';
    }
  }

  /**
   * Transcribes a raw audio buffer using Groq's Whisper endpoint.
   * Accepts a Buffer of audio data (mu-law, PCM, mp3, wav, etc.)
   * and returns the transcribed text.
   */
  async transcribeBuffer(audioBuffer: Buffer, mimeType: string = 'audio/wav'): Promise<string> {
    try {
      logger.debug(`[STT] Transcribing ${audioBuffer.length} bytes via Groq Whisper`);

      const file = await toFile(audioBuffer, 'audio.wav', { type: mimeType });

      const transcription = await groq.audio.transcriptions.create({
        file,
        model: GROQ_STT_MODEL,
        language: DEEPGRAM_LANGUAGE.split('-')[0], // e.g. "en" from "en-US"
        response_format: 'json',
      });

      const text = transcription.text?.trim() ?? '';
      logger.debug(`[STT] Transcribed: "${text}"`);
      return text;
    } catch (error) {
      logger.error(`[STT] Groq Whisper transcription failed: ${error}`);
      return '';
    }
  }

  /**
   * Streams audio chunks (collected from Twilio media stream) and returns transcription
   * once stream ends. Chunks are base64-encoded mu-law 8kHz audio from Twilio.
   */
  startStream(callId: string, onTranscription: (text: string) => void) {
    logger.info(`[STT] Starting Groq Whisper stream for call ${callId}`);
    const chunks: Buffer[] = [];

    return {
      sendChunk: (base64Audio: string) => {
        const buf = Buffer.from(base64Audio, 'base64');
        chunks.push(buf);
      },
      stop: async () => {
        if (chunks.length === 0) return;
        const combined = Buffer.concat(chunks);
        const text = await this.transcribeBuffer(combined, 'audio/x-mulaw');
        if (text) onTranscription(text);
        logger.info(`[STT] Stream ended for call ${callId}`);
      }
    };
  }
}

export const speechToText = new SpeechToText();
