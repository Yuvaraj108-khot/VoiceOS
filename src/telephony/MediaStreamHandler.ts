import { WebSocket } from 'ws';
import { logger } from '../lib/logger';
import { AudioStreamer } from './AudioStreamer';
import { speechToText } from '../voice/SpeechToText';
import { textToSpeech } from '../voice/TextToSpeech';
import { conversationEngine } from '../conversation/ConversationEngine';
import { callSessionManager } from './CallSessionManager';
import { prisma } from '../lib/prisma';

export type CallState = 'START' | 'GREETING' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ENDED';

export class MediaStreamHandler {
  private ws: WebSocket;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private employeeId: string = '';
  private voiceId: string = 'en-US-AriaNeural';
  private state: CallState = 'START';
  private audioStreamer: AudioStreamer;
  private markSafetyTimer: NodeJS.Timeout | null = null;
  private isCleanedUp: boolean = false;

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.audioStreamer = new AudioStreamer(
      this.sendMedia.bind(this),
      this.sendMark.bind(this)
    );

    // Wire speech complete and barge-in callbacks
    this.audioStreamer.onSpeechComplete = this.handleSpeechComplete.bind(this);
    this.audioStreamer.onBargeIn = this.handleBargeIn.bind(this);

    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
  }

  private handleBargeIn() {
    if (this.state === 'SPEAKING' || this.state === 'GREETING') {
      logger.info('[VOICE] Caller barge-in detected! Clearing Twilio audio buffer and interrupting AI...');
      this.clearSafetyTimer();
      this.audioStreamer.cancelPlayback();

      // Send clear event to Twilio to immediately stop audio in caller's earpiece
      if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
        this.ws.send(JSON.stringify({
          event: 'clear',
          streamSid: this.streamSid,
        }));
      }

      // Transition immediately to LISTENING to capture the caller's spoken words
      this.state = 'LISTENING';
      this.audioStreamer.setListening(true);
      logger.info('[VOICE] AI interrupted. Now listening to caller');
    }
  }

  private async handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      switch (msg.event) {
        case 'connected':
          logger.info(`[CALL] Twilio media stream connected: ${msg.protocol}`);
          break;

        case 'start':
          await this.handleStreamStart(msg.start);
          break;

        case 'media':
          if (msg.media && msg.media.payload) {
            this.audioStreamer.receiveAudio(msg.media.payload);
          }
          break;

        case 'mark':
          if (msg.mark && msg.mark.name) {
            this.handleMark(msg.mark.name);
          }
          break;

        case 'stop':
          logger.info(`[CALL] Twilio stream stopped | SID: ${this.callSid}`);
          this.state = 'ENDED';
          this.cleanup();
          break;
      }
    } catch (err: any) {
      logger.error(`[CALL] Error parsing media stream message: ${err.message}`);
    }
  }

  private async handleStreamStart(startData: any) {
    this.streamSid = startData.streamSid;
    this.callSid = startData.callSid;
    const customParams = startData.customParameters || {};
    this.employeeId = customParams.employeeId || '';

    logger.info(`[CALL] Incoming call | SID: ${this.callSid}`);
    logger.info(`[CALL] Twilio stream started | StreamSID: ${this.streamSid}`);

    this.audioStreamer.start(this.callSid!);

    // 1. Resolve AI Employee & Greeting
    let greetingText = "Hi! Thanks for reaching out. I'm Yuvaraj, your AI Sales Development Representative. How can I help you today?";

    try {
      let employee = null;
      if (this.employeeId) {
        employee = await prisma.aIEmployee.findUnique({
          where: { id: this.employeeId },
          include: { voiceProfile: true }
        }).catch(() => null);
      }

      if (!employee) {
        employee = await prisma.aIEmployee.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          include: { voiceProfile: true }
        }).catch(() => null);
      }

      if (employee) {
        this.employeeId = employee.id;
        if (employee.firstMessage) {
          greetingText = employee.firstMessage;
        }
        if (employee.voiceProfile?.voiceId) {
          this.voiceId = employee.voiceProfile.voiceId;
        }
      }

      // Update call session
      await callSessionManager.saveSession({
        callId: this.callSid!,
        employeeId: this.employeeId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        variables: {},
      });

      // Update Call record in DB
      const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      await prisma.call.updateMany({
        where: isUuid(this.callSid!) 
          ? { OR: [{ twilioCallSid: this.callSid! }, { id: this.callSid! }] }
          : { twilioCallSid: this.callSid! },
        data: { status: 'IN_PROGRESS', startedAt: new Date() }
      }).catch(() => null);

    } catch (err: any) {
      logger.warn(`[CALL] Error resolving employee: ${err.message}`);
    }

    // 2. Play greeting
    await this.playGreeting(greetingText);
  }

  private async playGreeting(greetingText: string) {
    this.state = 'GREETING';
    this.audioStreamer.setListening(false);
    this.audioStreamer.setBargeInEnabled(true);
    logger.info(`[VOICE] Greeting started: "${greetingText}"`);

    try {
      const mulawAudio = await textToSpeech.generateMulawAudio(greetingText, this.voiceId);

      // Stream greeting audio to Twilio
      const completed = await this.audioStreamer.playMulaw(mulawAudio, 'greeting_complete');
      if (!completed) {
        // Interrupted by caller barge-in
        return;
      }

      // Set fallback timer in case Twilio mark is delayed
      const approxDurationMs = Math.max(1500, (mulawAudio.length / 8000) * 1000 + 1500);
      this.clearSafetyTimer();
      this.markSafetyTimer = setTimeout(() => {
        if (this.state === 'GREETING') {
          logger.info('[VOICE] Greeting completed (safety timer fired)');
          this.transitionToListening();
        }
      }, approxDurationMs);

    } catch (err: any) {
      logger.error(`[VOICE] Failed to play greeting: ${err.message}`);
      this.transitionToListening();
    }
  }

  private handleMark(markName: string) {
    logger.debug(`[CALL] Received Twilio mark: ${markName}`);

    if (markName === 'greeting_complete') {
      this.clearSafetyTimer();
      logger.info('[VOICE] Greeting completed');
      this.transitionToListening();
    } else if (markName === 'ai_response_complete') {
      this.clearSafetyTimer();
      logger.info('[VOICE] Response playback completed');
      this.transitionToListening();
    }
  }

  private transitionToListening() {
    this.state = 'LISTENING';
    logger.info('[VOICE] Waiting for caller');
    this.audioStreamer.setListening(true);
  }

  /**
   * Called by AudioStreamer when the caller completes an utterance.
   */
  private async handleSpeechComplete(mulawBuffer: Buffer) {
    if (this.state !== 'LISTENING') {
      return;
    }

    const tStart = Date.now();
    logger.info('[AUDIO] Caller media received');
    this.state = 'PROCESSING';
    this.audioStreamer.setListening(false);

    try {
      // 1. Convert to text via Groq Whisper STT
      const tSttStart = Date.now();
      const transcript = await speechToText.transcribeMulawBuffer(mulawBuffer);
      const sttMs = Date.now() - tSttStart;

      if (!transcript || transcript.trim().length === 0 || transcript.trim() === '.') {
        logger.debug('[STT] Empty or unintelligible audio, resuming listening');
        this.transitionToListening();
        return;
      }

      logger.info(`[STT] Transcript received: "${transcript}"`);

      // 2. Stream AI response via Groq LLM + synthesize TTS sentence-by-sentence in parallel!
      logger.info('[LLM] Streaming response & generating speech concurrently');
      let firstChunkSent = false;
      let totalTtsMs = 0;
      let sentenceIndex = 0;

      const aiResponse = await conversationEngine.processUserInputStreaming(
        this.callSid!,
        transcript,
        this.employeeId,
        async (sentence: string, isFinal: boolean) => {
          if (!sentence || sentence.trim().length === 0) {
            if (isFinal && firstChunkSent) {
              this.sendMark('ai_response_complete');
            }
            return;
          }

          if (this.state !== 'PROCESSING' && this.state !== 'SPEAKING') {
            // User interrupted via barge-in, cancel sentence processing
            return;
          }

          this.state = 'SPEAKING';
          this.audioStreamer.setBargeInEnabled(true);
          sentenceIndex++;

          const tSentenceTts = Date.now();
          const mulawSentence = await textToSpeech.generateMulawAudio(sentence, this.voiceId);
          const sentenceTtsMs = Date.now() - tSentenceTts;
          totalTtsMs += sentenceTtsMs;

          if (!firstChunkSent) {
            firstChunkSent = true;
            const ttfa = Date.now() - tStart;
            logger.info(`[LATENCY] >>> TTFA (Time-To-First-Audio): ${ttfa}ms <<< (STT: ${sttMs}ms, First-Sentence TTS: ${sentenceTtsMs}ms) | First Sentence: "${sentence}"`);
            logger.info('[VOICE] Sending audio to caller');
          }

          const markName = isFinal ? 'ai_response_complete' : undefined;
          const completed = await this.audioStreamer.playMulaw(mulawSentence, markName);
          if (!completed) {
            logger.debug(`[VOICE] Sentence ${sentenceIndex} interrupted by caller`);
          }
        }
      );

      const totalTurnAround = Date.now() - tStart;
      logger.info(`[LLM] Full response generated: "${aiResponse}"`);
      logger.info(`[LATENCY-SUMMARY] Total Turnaround: ${totalTurnAround}ms | STT: ${sttMs}ms | Cumulative TTS: ${totalTtsMs}ms`);

      // Set fallback timer in case Twilio mark is delayed
      this.clearSafetyTimer();
      this.markSafetyTimer = setTimeout(() => {
        if (this.state === 'SPEAKING') {
          logger.info('[VOICE] Response completed (safety timer fired)');
          this.transitionToListening();
        }
      }, 4000);

    } catch (err: any) {
      logger.error(`[CALL] Error processing caller speech: ${err.message}`);
      // Resilient fallback: inform caller and return to listening
      this.transitionToListening();
    }
  }

  private sendMedia(base64Payload: string) {
    if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
      const message = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: base64Payload
        }
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendMark(markName: string) {
    if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
      const message = {
        event: 'mark',
        streamSid: this.streamSid,
        mark: {
          name: markName
        }
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private clearSafetyTimer() {
    if (this.markSafetyTimer) {
      clearTimeout(this.markSafetyTimer);
      this.markSafetyTimer = null;
    }
  }

  private handleClose() {
    logger.info(`[CALL] WebSocket closed for stream ${this.streamSid}`);
    this.cleanup();
  }

  private handleError(error: Error) {
    logger.error(`[CALL] WebSocket error on stream ${this.streamSid}: ${error.message}`);
  }

  private async cleanup() {
    if (this.isCleanedUp) return;
    this.isCleanedUp = true;
    this.clearSafetyTimer();
    this.audioStreamer.stop();

    if (this.callSid) {
      await callSessionManager.endSession(this.callSid, 'COMPLETED', 0).catch(() => null);
    }
  }
}
