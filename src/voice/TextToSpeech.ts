import { logger } from '../lib/logger';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { audioProcessor } from './AudioProcessor';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const EDGE_TTS_VOICE = process.env.EDGE_TTS_VOICE ?? 'en-US-AriaNeural';
const EDGE_TTS_RATE  = process.env.EDGE_TTS_RATE  ?? '+10%';
const EDGE_TTS_PITCH = process.env.EDGE_TTS_PITCH ?? '+0Hz';

export class TextToSpeech {
  private clientCache: Map<string, MsEdgeTTS> = new Map();

  private async getClient(voice: string): Promise<MsEdgeTTS> {
    if (this.clientCache.has(voice)) {
      return this.clientCache.get(voice)!;
    }
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    this.clientCache.set(voice, tts);
    return tts;
  }

  /**
   * Converts text to audio using Microsoft Edge TTS in-memory native stream.
   */
  async generateAudio(text: string, voiceId?: string): Promise<string> {
    const mulaw = await this.generateMulawAudio(text, voiceId);
    return mulaw.toString('base64');
  }

  /**
   * Generates 8000Hz 8-bit mono μ-law (PCMU) audio Buffer ready for streaming to Twilio.
   * Uses high-speed in-memory native WebSocket streaming (~350ms-500ms).
   */
  async generateMulawAudio(text: string, voiceId?: string): Promise<Buffer> {
    const voice = voiceId ?? EDGE_TTS_VOICE;
    if (!text || text.trim().length === 0) {
      return Buffer.alloc(0);
    }
    logger.debug(`[TTS] Generating μ-law audio via native Edge-TTS | voice: ${voice} | text: "${text.slice(0, 60)}..."`);

    try {
      const tGenStart = Date.now();
      const tts = await this.getClient(voice);

      const mp3Buffer = await new Promise<Buffer>((resolve, reject) => {
        const { audioStream } = tts.toStream(text, {
          rate: EDGE_TTS_RATE,
          pitch: EDGE_TTS_PITCH,
        });
        const chunks: Buffer[] = [];
        audioStream.on('data', (c: Buffer) => chunks.push(c));
        audioStream.on('close', () => resolve(Buffer.concat(chunks)));
        audioStream.on('error', (err) => reject(err));
      });

      const genMs = Date.now() - tGenStart;

      // In-memory transcoding from 24kHz MP3 to 8kHz μ-law mono
      const tFfmpegStart = Date.now();
      const mulawBuffer = await audioProcessor.mp3ToMulaw(mp3Buffer);
      const ffmpegMs = Date.now() - tFfmpegStart;

      logger.info(`[TTS-PROFILE] edge_tts_gen: ${genMs}ms | ffmpeg_transcode: ${ffmpegMs}ms | output_mulaw: ${mulawBuffer.length} bytes`);
      return mulawBuffer;
    } catch (error: any) {
      logger.warn(`[TTS] Native MsEdgeTTS failed (${error.message}), falling back to CLI...`);
      return this.fallbackCliMulaw(text, voice);
    }
  }

  private async fallbackCliMulaw(text: string, voice: string): Promise<Buffer> {
    try {
      const tmpFile = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('edge-tts', [
          '--voice', voice,
          '--rate',  EDGE_TTS_RATE,
          '--pitch', EDGE_TTS_PITCH,
          '--text',  text,
          '--write-media', tmpFile,
        ]);
        proc.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`edge-tts exited with code ${code}`));
        });
        proc.on('error', reject);
      });
      const audioBuffer = fs.readFileSync(tmpFile);
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      return await audioProcessor.mp3ToMulaw(audioBuffer);
    } catch (e: any) {
      logger.error(`[TTS] Fallback CLI failed: ${e.message}`);
      return Buffer.alloc(0);
    }
  }

  /**
   * Pre-fetches a common filler phrase audio to reduce latency
   * while the LLM is thinking ("Sure, let me check that for you...")
   */
  async getFillerAudio(voiceId?: string): Promise<string> {
    const fillerPhrases = [
      "Sure, let me check that for you.",
      "One moment please.",
      "Let me look into that.",
    ];
    const phrase = fillerPhrases[Math.floor(Math.random() * fillerPhrases.length)];
    return this.generateAudio(phrase, voiceId);
  }

  /**
   * Returns the list of available Edge-TTS voices.
   * Useful for letting users pick a voice for their AI Employee.
   */
  static popularVoices = [
    { id: 'en-US-AriaNeural',    name: 'Aria (US Female)'   },
    { id: 'en-US-GuyNeural',     name: 'Guy (US Male)'      },
    { id: 'en-US-JennyNeural',   name: 'Jenny (US Female)'  },
    { id: 'en-GB-SoniaNeural',   name: 'Sonia (UK Female)'  },
    { id: 'en-AU-NatashaNeural', name: 'Natasha (AU Female)' },
    { id: 'en-IN-NeerjaNeural',  name: 'Neerja (IN Female)' },
  ];
}

export const textToSpeech = new TextToSpeech();
