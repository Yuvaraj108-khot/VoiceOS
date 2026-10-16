import { logger } from '../lib/logger';
import { groq } from '../lib/groq';
import { audioProcessor } from './AudioProcessor';
import dotenv from 'dotenv';

dotenv.config();

const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL ?? 'whisper-large-v3-turbo';
const STT_LANGUAGE = process.env.STT_LANGUAGE ?? ''; // Empty = auto-detect (supports Hinglish!)

export class SpeechToText {
  /**
   * Transcribes a raw 8000Hz μ-law buffer from Twilio by converting it to WAV first.
   */
  async transcribeMulawBuffer(mulawBuffer: Buffer): Promise<string> {
    try {
      if (!mulawBuffer || mulawBuffer.length < 800) {
        // Less than 100ms of audio, skip
        logger.debug(`[STT] Audio buffer too small (${mulawBuffer?.length || 0} bytes), skipping`);
        return '';
      }

      const inputDurationSec = (mulawBuffer.length / 8000).toFixed(2);
      logger.info(`[STT] audio buffer size: ${mulawBuffer.length} bytes (~${inputDurationSec}s)`);
      logger.info(`[STT] conversion started: mu-law 8kHz -> PCM WAV 16kHz`);

      const tFfmpeg = Date.now();
      const wavBuffer = await audioProcessor.mulawToWav(mulawBuffer);
      const ffmpegMs = Date.now() - tFfmpeg;
      const wavDurationSec = ((wavBuffer.length - 44) / 32000).toFixed(2);

      logger.info(`[STT] conversion completed: ${wavBuffer.length} bytes in ${ffmpegMs}ms`);
      logger.info(`[STT] WAV duration: ${wavDurationSec}s | sample rate: 16000Hz | channels: 1 | 16-bit PCM`);

      const text = await this.transcribeBuffer(wavBuffer, 'audio/wav');

      logger.info(`[STT-PROFILE] ffmpeg_wav: ${ffmpegMs}ms | total_stt_pipeline: ${Date.now() - tFfmpeg}ms`);
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
  /**
   * Transcribes a raw audio buffer using Groq's Whisper endpoint via direct high-speed HTTP fetch.
   * Completely avoids groq-sdk toFile streaming freeze on Windows Node 22 (1.4s vs 94s).
   */
  async transcribeBuffer(audioBuffer: Buffer, mimeType: string = 'audio/wav'): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for free-tier Groq

    try {
      logger.info(`[STT] Whisper request started: model=${GROQ_STT_MODEL} | payload: ${audioBuffer.length} bytes`);

      const tGroq = Date.now();
      const form = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType });
      form.append('file', blob, 'audio.wav');
      form.append('model', GROQ_STT_MODEL);
      form.append('response_format', 'json');
      // Auto-detect language — handles English, Hindi, and Hinglish (English+Hindi mix) seamlessly!
      if (STT_LANGUAGE) {
        form.append('language', STT_LANGUAGE);
      }

      const apiKey = process.env.GROQ_API_KEY;
      const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.error(`[STT] Groq Whisper HTTP ${res.status}: ${errText}`);
        return '';
      }

      const data: any = await res.json();
      const groqMs = Date.now() - tGroq;
      let text = data.text?.trim() ?? '';

      // Filter out non-speech noise, dog barks, and Whisper phantom hallucinations
      if (this.isNoiseHallucination(text)) {
        logger.info(`[STT] Ignored non-speech noise / hallucination: "${text}"`);
        return '';
      }

      logger.info(`[STT] Whisper response: status=200 (${groqMs}ms)`);
      logger.info(`[STT] transcript: "${text}"`);
      return text;
    } catch (error: any) {
      clearTimeout(timeout);
      logger.error(`[STT] Groq Whisper transcription failed: ${error.message || error}`);
      return '';
    }
  }

  private isNoiseHallucination(rawText: string): boolean {
    if (!rawText || rawText.trim().length === 0) return true;
    const lower = rawText.toLowerCase().trim();

    // 1. Bracketed or parenthesized sound effects: [barking], (laughter), *music*, etc.
    const strippedBrackets = lower.replace(/\[.*?\]|\(.*?\)|<.*?>|\*.*?\*/g, '').trim();
    if (strippedBrackets.length === 0) {
      return true;
    }

    // 2. Common Whisper phantom hallucinations produced on animal sounds or sharp room noise
    const phantomPhrases = [
      'you got to give up',
      'thank you for watching',
      'thanks for watching',
      'please subscribe',
      'subtitles by',
      'translated by',
      'amara.org',
      'so you',
      'thank you very much.',
      'thank you.',
    ];
    for (const phrase of phantomPhrases) {
      if (lower === phrase || lower === phrase + '.') {
        return true;
      }
    }

    // 3. Pure punctuation
    if (/^[.\s,?!'"\-_~]+$/.test(rawText)) return true;

    return false;
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
