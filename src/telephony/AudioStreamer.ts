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
  private preBuffer: Buffer[] = []; // Rolling 200ms pre-speech buffer (10 chunks)
  private totalSpeechBytes: number = 0;
  private consecutiveVoiceChunks: number = 0;
  private isCancelled: boolean = false;
  private totalChunksReceived: number = 0;

  // Thresholds & Constants: strictly calibrated for clean phone speech vs ambient room noise
  private readonly SPEECH_THRESHOLD = 220;       // Reject ambient noise, distant dog barks, and phone rustle (<220 RMS)
  private readonly BARGE_IN_THRESHOLD = 700;     // Intentional close-mic human speech to interrupt AI (guards against echo/barks)
  private readonly BARGE_IN_REQUIRED_CHUNKS = 10; // 10 * 20ms = 200ms sustained speech to confirm barge-in
  private readonly SILENCE_HANGOVER_CHUNKS = 35; // 35 * 20ms = 700ms silence before completing utterance (allows natural word pauses)
  private readonly MIN_UTTERANCE_BYTES = 3200;   // Minimum 400ms (3200 bytes @ 8kHz) allows natural short words like "yes", "hello"

  // Event callbacks
  public onSpeechStart?: () => void;
  public onSpeechComplete?: (mulawBuffer: Buffer) => void;
  public onBargeIn?: () => void;
  public onDtmfTone?: () => void;

  constructor(sendMedia: SendMediaCallback, sendMark: SendMarkCallback) {
    this.sendMedia = sendMedia;
    this.sendMark = sendMark;
  }

  start(callSid: string) {
    this.callSid = callSid;
    this.resetBuffers();
    this.isCancelled = false;
    this.totalChunksReceived = 0;
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

      this.totalChunksReceived++;
      const rms = audioProcessor.getRms(chunk);
      const isVoice = rms >= this.SPEECH_THRESHOLD;
      const isVoiceForBargeIn = rms >= this.BARGE_IN_THRESHOLD;

      // Diagnostic logging every 50 chunks (~1s) when idle or during speech transitions
      if (this.totalChunksReceived % 50 === 1 && !this.isSpeaking) {
        logger.debug(`[MEDIA STREAM] audio received | audio bytes: ${chunk.length} | total chunks: ${this.totalChunksReceived} | idle RMS: ${rms.toFixed(0)}`);
      }

      // Check for keypad DTMF keypress (Twilio trial prompt bypass)
      if (chunk.length >= 160 && audioProcessor.isDtmfTone(chunk)) {
        logger.info('[VAD] Incoming audio is a keypad DTMF tone. Triggering onDtmfTone callback!');
        this.resetBuffers();
        this.onDtmfTone?.();
        return;
      }

      // Check barge-in when AI is speaking
      if (this.isBargeInEnabled && !this.isListening) {
        if (isVoiceForBargeIn) {
          this.consecutiveVoiceChunks++;
          logger.info(`[VAD] Barge-in candidate (RMS: ${rms.toFixed(0)}, consecutive: ${this.consecutiveVoiceChunks}/${this.BARGE_IN_REQUIRED_CHUNKS})`);
          // Require sustained high-energy caller speech to interrupt
          if (this.consecutiveVoiceChunks >= this.BARGE_IN_REQUIRED_CHUNKS) {
            this.consecutiveVoiceChunks = 0;
            this.isBargeInEnabled = false;
            logger.info(`[VOICE] Caller barge-in confirmed (RMS: ${rms.toFixed(0)})`);
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
          logger.info('[VOICE] Caller speech detected');
          logger.info(`[VAD] RMS: ${rms.toFixed(0)} | speech detected: true`);
          this.onSpeechStart?.();
        } else {
          this.speechChunks.push(chunk);
          this.totalSpeechBytes += chunk.length;
          // Log periodically during ongoing speech
          if (this.speechChunks.length % 25 === 0) {
            logger.debug(`[VAD] RMS: ${rms.toFixed(0)} | speech detected: true | utterance duration: ${((this.totalSpeechBytes / 8000) * 1000).toFixed(0)}ms`);
          }
        }
        this.silenceChunkCount = 0;

        // Cap maximum utterance length at ~20 seconds (160,000 bytes)
        if (this.totalSpeechBytes > 160000) {
          logger.info(`[VAD] Max utterance length reached (~20s), flushing speech`);
          this.flushSpeech();
        }
      } else {
        // Silence chunk
        if (this.isSpeaking) {
          this.speechChunks.push(chunk);
          this.totalSpeechBytes += chunk.length;
          this.silenceChunkCount++;

          const utteranceDurationMs = ((this.totalSpeechBytes / 8000) * 1000).toFixed(0);
          if (this.silenceChunkCount % 10 === 0 || this.silenceChunkCount >= this.SILENCE_HANGOVER_CHUNKS) {
            logger.info(`[VAD] RMS: ${rms.toFixed(0)} | silence detected: ${this.silenceChunkCount}/${this.SILENCE_HANGOVER_CHUNKS} | utterance duration: ${utteranceDurationMs}ms`);
          }

          // ~35 silence chunks = ~700ms silence -> caller finished speaking
          if (this.silenceChunkCount >= this.SILENCE_HANGOVER_CHUNKS) {
            this.flushSpeech();
          }
        } else {
          // Rolling pre-speech buffer (keep last 10 chunks ~200ms)
          this.preBuffer.push(chunk);
          if (this.preBuffer.length > 10) {
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
    const utteranceDurationMs = ((fullUtterance.length / 8000) * 1000).toFixed(0);
    this.resetBuffers();

    // Check if utterance is a telephone keypad DTMF tone (trial prompt cleared)
    if (audioProcessor.isDtmfTone(fullUtterance)) {
      logger.info(`[VAD] Keypad DTMF tone detected (~${utteranceDurationMs}ms). Triggering onDtmfTone callback!`);
      this.onDtmfTone?.();
      return;
    }

    logger.info(`[VOICE] Caller utterance complete — sending to STT (buffer: ${fullUtterance.length} bytes, ~${utteranceDurationMs}ms)`);

    // Must be at least 300ms (2400 bytes) to prevent noise clicks from triggering STT
    if (fullUtterance.length >= this.MIN_UTTERANCE_BYTES) {
      this.onSpeechComplete?.(fullUtterance);
    } else {
      logger.info(`[VAD] Utterance too short (${fullUtterance.length} bytes < ${this.MIN_UTTERANCE_BYTES} bytes), ignoring noise click`);
    }
  }

  /**
   * Plays a μ-law audio buffer to Twilio in 640-byte chunks with real-time pacing.
   * Pacing prevents Twilio buffer overflow which causes 2-second pauses between sentences.
   */
  async playMulaw(mulawBuffer: Buffer, markName?: string): Promise<boolean> {
    if (!mulawBuffer || mulawBuffer.length === 0) {
      if (markName) this.sendMark(markName);
      return true;
    }

    this.isCancelled = false;
    const CHUNK_SIZE = 640; // 80ms of 8000Hz 8-bit mono audio
    const CHUNK_INTERVAL_MS = 60; // Send slightly faster than real-time to stay ahead of playback

    for (let offset = 0; offset < mulawBuffer.length; offset += CHUNK_SIZE) {
      if (this.isCancelled) {
        logger.debug('[AudioStreamer] Playback cancelled mid-stream (barge-in)');
        return false;
      }
      const chunk = mulawBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, mulawBuffer.length));
      this.sendMedia(chunk.toString('base64'));

      // Real-time pacing: wait before next chunk to prevent Twilio buffer overflow
      if (offset + CHUNK_SIZE < mulawBuffer.length) {
        await new Promise<void>(resolve => setTimeout(resolve, CHUNK_INTERVAL_MS));
      }
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
