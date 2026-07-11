import { logger } from '../lib/logger';
// import { conversationEngine } from '../conversation/ConversationEngine'; // Phase 10

export type SendMediaCallback = (base64Payload: string, markName?: string) => void;

export class AudioStreamer {
  private callSid: string | null = null;
  private sendMedia: SendMediaCallback;
  private audioBuffer: string[] = []; // Simple buffer for incoming chunks
  private isProcessing: boolean = false;

  constructor(sendMedia: SendMediaCallback) {
    this.sendMedia = sendMedia;
  }

  start(callSid: string) {
    this.callSid = callSid;
    logger.info(`AudioStreamer started for call ${callSid}`);
    // Notify conversation engine that call started
    // conversationEngine.handleCallStart(callSid);
  }

  /**
   * Receives incoming audio from Twilio (base64 mu-law)
   */
  receiveAudio(base64Payload: string) {
    this.audioBuffer.push(base64Payload);
    
    // In a real implementation, we would pass this buffer to Deepgram/STT via WebSockets.
    // For scaffolding, we simulate buffering and processing.
    if (this.audioBuffer.length >= 50 && !this.isProcessing) {
      this.processBuffer();
    }
  }

  private processBuffer() {
    this.isProcessing = true;
    const chunk = this.audioBuffer.join('');
    this.audioBuffer = [];
    
    // Send to STT engine
    // conversationEngine.handleAudioInput(this.callSid!, chunk);
    
    this.isProcessing = false;
  }

  /**
   * Called by the TTS engine to send audio back to the caller
   */
  playAudio(base64Payload: string, markName?: string) {
    this.sendMedia(base64Payload, markName);
  }

  /**
   * Called when Twilio confirms playback of a specific chunk
   */
  handleMark(markName: string) {
    logger.debug(`Audio mark reached: ${markName}`);
  }

  stop() {
    logger.info(`AudioStreamer stopped for call ${this.callSid}`);
    // conversationEngine.handleCallEnd(this.callSid!);
    this.callSid = null;
    this.audioBuffer = [];
  }
}
