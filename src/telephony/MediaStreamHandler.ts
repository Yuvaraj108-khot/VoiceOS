import { WebSocket } from 'ws';
import { logger } from '../lib/logger';
import { AudioStreamer } from './AudioStreamer';

export class MediaStreamHandler {
  private ws: WebSocket;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private audioStreamer: AudioStreamer;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.audioStreamer = new AudioStreamer(this.sendMedia.bind(this));
    
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      switch (msg.event) {
        case 'connected':
          logger.info(`Media Stream Connected: ${msg.protocol}`);
          break;

        case 'start':
          this.streamSid = msg.start.streamSid;
          this.callSid = msg.start.callSid;
          logger.info(`Media Stream Started: ${this.streamSid} for Call: ${this.callSid}`);
          
          // Initialize conversation engine hooks here
          this.audioStreamer.start(this.callSid!);
          break;

        case 'media':
          // payload is base64 encoded mu-law audio
          this.audioStreamer.receiveAudio(msg.media.payload);
          break;

        case 'stop':
          logger.info(`Media Stream Stopped: ${this.streamSid}`);
          this.audioStreamer.stop();
          break;

        case 'mark':
          // Used to track when specific audio chunks finish playing on Twilio's end
          this.audioStreamer.handleMark(msg.mark.name);
          break;
      }
    } catch (err) {
      logger.error(`Error parsing Media Stream message: ${err}`);
    }
  }

  private handleClose() {
    logger.info(`WebSocket closed for stream ${this.streamSid}`);
    this.audioStreamer.stop();
  }

  private handleError(error: Error) {
    logger.error(`WebSocket error on stream ${this.streamSid}: ${error.message}`);
  }

  /**
   * Sends audio back to Twilio (must be base64 encoded mu-law 8000Hz).
   */
  private sendMedia(base64Payload: string, markName?: string) {
    if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
      const message = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: base64Payload
        }
      };
      this.ws.send(JSON.stringify(message));

      if (markName) {
        this.ws.send(JSON.stringify({
          event: 'mark',
          streamSid: this.streamSid,
          mark: { name: markName }
        }));
      }
    }
  }
}
