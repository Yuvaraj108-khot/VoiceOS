import { logger } from '../lib/logger';
import { audioProcessor } from '../voice/AudioProcessor';

export type SendMediaCallback = (base64Payload: string) => void;
export type SendMarkCallback = (markName: string) => void;

export class AudioStreamer {
  private callSid: string | null = null;
  private sendMedia: SendMediaCallback;
  private sendMark: SendMarkCallback;

  // Audio receiving & VAD state
  private isListening: boolean = false;
  private isBargeInEnabled: boolean = false;
  private isSpeaking: boolean = false;
  private silenceChunkCount: number = 0;
  private speechChunks: Buffer[] = [];
  private preBuffer: Buffer[] = []; // Rolling 160ms pre-speech buffer
  private totalSpeechBytes: number = 0;
  private consecutiveVoiceChunks: number = 0;
  private isCancelled: boolean = false;

  // Event callbacks
  public onSpeechStart?: () => void;
  public onSpeechComplete?: (mulawBuffer: Buffer) => void;
  public onBargeIn?: () => void;

  constructor(sendMedia: SendMediaCallback, sendMark: SendMarkCallback) {
    this.sendMedia = sendMedia;
    this.sendMark = sendMark;
  }

  start(callSid: string) {
    this.callSid = callSid;
    this.resetBuffers();
    this.isCancelled = false;
    logger.debug(`[AudioStreamer] Started for call ${callSid}`);
  }

  setListening(listening: boolean) {
    this.isListening = listening;
    this.isBargeInEnabled = false;
    if (listening) {
      this.resetBuffers();
    }
  }

  setBargeInEnabled(enabled: boolean) {
    this.isBargeInEnabled = enabled;
    this.consecutiveVoiceChunks = 0;
  }

  getListening(): boolean {
    return this.isListening;
  }

  cancelPlayback() {
    this.isCancelled = true;
  }

  private resetBuffers() {
    this.isSpeaking = false;
    this.silenceChunkCount = 0;
    this.speechChunks = [];
    this.preBuffer = [];
    this.totalSpeechBytes = 0;
    this.consecutiveVoiceChunks = 0;
  }

  /**
   * Receives incoming audio from Twilio (base64 μ-law 8000Hz)
   */
  receiveAudio(base64Payload: string) {
    try {
      const chunk = Buffer.from(base64Payload, 'base64');
      if (chunk.length === 0) return;

      const rms = audioProcessor.getRms(chunk);
      const isVoice = rms > 350; // Speech threshold

      // Check barge-in when AI is speaking or greeting
      if (this.isBargeInEnabled && !this.isListening) {
        if (isVoice) {
          this.consecutiveVoiceChunks++;
          // If caller speaks for ~60ms (3 chunks), trigger barge-in interruption!
          if (this.consecutiveVoiceChunks >= 3) {
            this.consecutiveVoiceChunks = 0;
            this.isBargeInEnabled = false;
            // Pre-seed speech chunks with the interruption audio
            this.speechChunks = [chunk];
            this.onBargeIn?.();
            return;
          }
        } else {
          this.consecutiveVoiceChunks = 0;
        }
        return;
      }

      if (!this.isListening) {
        return;
      }

      if (isVoice) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.speechChunks = [...this.preBuffer, chunk];
          this.preBuffer = [];
          this.totalSpeechBytes = this.speechChunks.reduce((acc, c) => acc + c.length, 0);
          this.onSpeechStart?.();
        } else {
          this.speechChunks.push(chunk);
          this.totalSpeechBytes += chunk.length;
        }
        this.silenceChunkCount = 0;

        // Cap maximum utterance length at ~20 seconds (160,000 bytes)
        if (this.totalSpeechBytes > 160000) {
          this.flushSpeech();
        }
      } else {
        // Silence chunk
        if (this.isSpeaking) {
          this.speechChunks.push(chunk);
          this.totalSpeechBytes += chunk.length;
          this.silenceChunkCount++;

          // ~20 silence chunks = ~400ms silence -> caller finished speaking (fast turn-taking)
          if (this.silenceChunkCount >= 20) {
            this.flushSpeech();
          }
        } else {
          // Rolling pre-speech buffer (keep last 8 chunks ~160ms)
          this.preBuffer.push(chunk);
          if (this.preBuffer.length > 8) {
            this.preBuffer.shift();
          }
        }
      }
    } catch (err: any) {
      logger.error(`[AudioStreamer] Error processing received audio: ${err.message}`);
    }
  }

  private flushSpeech() {
    if (this.speechChunks.length === 0) return;
    const fullUtterance = Buffer.concat(this.speechChunks);
    this.resetBuffers();

    // Must be at least 200ms (1600 bytes) so short answers like "Yes", "No", "Tomorrow" are processed
    if (fullUtterance.length >= 1600) {
      this.onSpeechComplete?.(fullUtterance);
    }
  }

  /**
   * Plays a μ-law audio buffer to Twilio in 640-byte chunks and sends a mark event at the end.
   */
  async playMulaw(mulawBuffer: Buffer, markName?: string): Promise<boolean> {
    if (!mulawBuffer || mulawBuffer.length === 0) {
      if (markName) this.sendMark(markName);
      return true;
    }

    this.isCancelled = false;
    const CHUNK_SIZE = 640; // 80ms of 8000Hz 8-bit mono audio
    for (let offset = 0; offset < mulawBuffer.length; offset += CHUNK_SIZE) {
      if (this.isCancelled) {
        logger.debug('[AudioStreamer] Playback cancelled mid-stream (barge-in)');
        return false;
      }
      const chunk = mulawBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, mulawBuffer.length));
      this.sendMedia(chunk.toString('base64'));
    }

    if (markName && !this.isCancelled) {
      this.sendMark(markName);
    }
    return !this.isCancelled;
  }

  stop() {
    this.isListening = false;
    this.isBargeInEnabled = false;
    this.isCancelled = true;
    this.resetBuffers();
    this.callSid = null;
    logger.debug(`[AudioStreamer] Stopped`);
  }
}
