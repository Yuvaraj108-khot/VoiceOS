import { WebSocket } from 'ws';
import { logger } from '../lib/logger';
import { AudioStreamer } from './AudioStreamer';
import { speechToText } from '../voice/SpeechToText';
import { textToSpeech } from '../voice/TextToSpeech';
import { conversationEngine } from '../conversation/ConversationEngine';
import { callSessionManager } from './CallSessionManager';
import { prisma } from '../lib/prisma';
import { thinkingSoundGenerator } from '../voice/ThinkingSoundGenerator';

export type CallState = 'START' | 'GREETING' | 'LISTENING' | 'PROCESSING' | 'SPEAKING' | 'ENDED';

export class MediaStreamHandler {
  private ws: WebSocket;
  private streamSid: string | null = null;
  private callSid: string | null = null;
  private employeeId: string = '';
  private voiceId: string = 'en-IN-NeerjaExpressiveNeural';
  private languageSelected: boolean = false;
  private currentLanguage: 'en' | 'hi' = 'en';
  private state: CallState = 'START';
  private audioStreamer: AudioStreamer;
  private markSafetyTimer: NodeJS.Timeout | null = null;
  private isCleanedUp: boolean = false;
  private thinkingInterval: NodeJS.Timeout | null = null;
  private thinkingTimeout: NodeJS.Timeout | null = null;
  private thinkingMaxTimer: NodeJS.Timeout | null = null;
  private isThinkingSoundActive: boolean = false;
  private activeTurnId: number = 0;
  private dtmfBuffer: string = '';
  private dtmfBufferTimer: NodeJS.Timeout | null = null;

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
    this.activeTurnId++; // Invalidate any running turn's async sentence generation
    this.stopThinkingSound();
    if (this.state === 'SPEAKING' || this.state === 'GREETING') {
      logger.info('[VOICE] Caller barge-in detected! Clearing Twilio audio buffer and interrupting AI...');
      this.clearSafetyTimer();
      this.audioStreamer.cancelPlayback();

      // Send clear event to Twilio to immediately stop audio in caller's earpiece
      this.sendClear();

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

        case 'dtmf':
          if (msg.dtmf && msg.dtmf.digit) {
            logger.info(`[KEYPAD] Twilio DTMF event received digit: '${msg.dtmf.digit}'`);
            this.handleDtmfInput(String(msg.dtmf.digit));
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

  // In-memory cache for ultra-fast employee resolution (seeded with user's actual configured AI Employee)
  private static cachedEmployeeProfile: { id: string; greeting: string; voiceId: string } | null = {
    id: '7a007f62-0dad-4368-9f1b-d6ff7181429d',
    greeting: "Hello and welcome! Press 1 for English. हिंदी के लिए दो दबाएं।",
    voiceId: 'en-IN-NeerjaExpressiveNeural'
  };
  private static lastProfileCacheTime = Date.now();

  private async handleStreamStart(startData: any) {
    const customParams = startData.customParameters || {};
    this.streamSid = startData.streamSid;
    this.callSid = customParams.callId || startData.callSid;
    if (customParams.employeeId) {
      this.employeeId = customParams.employeeId;
    }

    logger.info(`[CALL] Incoming call | SID: ${this.callSid}`);
    logger.info(`[CALL] Twilio stream started | StreamSID: ${this.streamSid}`);

    this.audioStreamer.start(this.callSid!);

    // 1. Resolve greeting instantaneously using user's actual configured firstMessage
    const greetingText = MediaStreamHandler.cachedEmployeeProfile?.greeting || 
      "Hello and welcome! Press 1 for English. हिंदी के लिए दो दबाएं।";
    if (MediaStreamHandler.cachedEmployeeProfile?.voiceId) {
      this.voiceId = MediaStreamHandler.cachedEmployeeProfile.voiceId;
    }

    // Play bilingual greeting lines immediately
    this.playGreeting(greetingText);

    // 2. Perform DB resolution and call tracking asynchronously in background
    (async () => {
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
          MediaStreamHandler.cachedEmployeeProfile = {
            id: employee.id,
            greeting: employee.firstMessage || greetingText,
            voiceId: employee.voiceProfile?.voiceId || this.voiceId
          };
          MediaStreamHandler.lastProfileCacheTime = Date.now();
        }

        // Update call session
        await callSessionManager.saveSession({
          callId: this.callSid!,
          employeeId: this.employeeId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          variables: {},
        }).catch(() => null);

        // Update Call record in DB
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        await prisma.call.updateMany({
          where: isUuid(this.callSid!) 
            ? { OR: [{ twilioCallSid: this.callSid! }, { id: this.callSid! }] }
            : { twilioCallSid: this.callSid! },
          data: { status: 'IN_PROGRESS', startedAt: new Date() }
        }).catch(() => null);
      } catch (err: any) {
        logger.warn(`[CALL] Background employee resolution warning: ${err.message}`);
      }
    })().catch(() => {});
  }

  private async playGreeting(greetingText: string) {
    this.state = 'GREETING';
    this.audioStreamer.setListening(false);
    this.audioStreamer.setBargeInEnabled(true);
    logger.info(`[VOICE] Greeting started: "${greetingText}"`);

    try {
      const isBilingual = greetingText.includes('English') && (greetingText.includes('हिंदी') || greetingText.includes('Hindi'));
      const mulawAudio = isBilingual 
        ? await textToSpeech.generateBilingualGreetingAudio()
        : await textToSpeech.generateMulawAudio(greetingText, this.voiceId);

      // Stream greeting audio to Twilio
      const completed = await this.audioStreamer.playMulaw(mulawAudio, 'greeting_complete');
      if (!completed) {
        logger.info('[VOICE] Greeting interrupted or cancelled by caller action');
        return;
      }

      this.clearSafetyTimer();
      this.markSafetyTimer = setTimeout(() => {
        if (this.state === 'GREETING') {
          logger.info('[VOICE] Greeting completed (fallback timer fired)');
          this.transitionToListening();
        }
      }, 1000);

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
    logger.info('[VOICE] Listening for caller...');
    this.audioStreamer.setListening(true);
  }

  private lastLanguageSelectionTime: number = 0;

  /**
   * Handles keypad DTMF digits pressed by the caller
   */
  public handleDtmfInput(digit: string) {
    logger.info(`[KEYPAD] Caller pressed digit '${digit}' | State: ${this.state} | Language Selected: ${this.languageSelected}`);

    // Language selection (1 for English, 2 for Hindi)
    if (!this.languageSelected && (this.state === 'GREETING' || this.state === 'LISTENING')) {
      if (digit === '1') {
        this.languageSelected = true;
        this.currentLanguage = 'en';
        this.lastLanguageSelectionTime = Date.now();
        this.voiceId = 'en-IN-NeerjaExpressiveNeural';
        if (this.callSid) {
          callSessionManager.updateVariables(this.callSid, { language: 'en' }).catch(() => {});
          prisma.call.updateMany({
            where: { OR: [{ id: this.callSid }, { twilioCallSid: this.callSid }] },
            data: { language: 'en' }
          }).catch(() => {});
        }
        this.playConfirmation(
          "English selected. How can I help you today?",
          'en-IN-NeerjaExpressiveNeural'
        );
        return;
      } else if (digit === '2') {
        this.languageSelected = true;
        this.currentLanguage = 'hi';
        this.lastLanguageSelectionTime = Date.now();
        this.voiceId = 'hi-IN-SwaraNeural';
        if (this.callSid) {
          callSessionManager.updateVariables(this.callSid, { language: 'hi' }).catch(() => {});
          prisma.call.updateMany({
            where: { OR: [{ id: this.callSid }, { twilioCallSid: this.callSid }] },
            data: { language: 'hi' }
          }).catch(() => {});
        }
        this.playConfirmation(
          "नमस्ते! बताइए, मैं आपकी क्या सहायता कर सकता हूँ?",
          'hi-IN-SwaraNeural'
        );
        return;
      }
    }

    // Ignore duplicate 1 or 2 presses if pressed immediately within 3s of selecting language
    if (this.languageSelected && (Date.now() - this.lastLanguageSelectionTime < 3000) && (digit === '1' || digit === '2')) {
      logger.info(`[KEYPAD] Ignoring duplicate language keypress '${digit}'`);
      return;
    }

    // Buffer digits for order number / reference ID keypad entry
    if (this.dtmfBufferTimer) {
      clearTimeout(this.dtmfBufferTimer);
      this.dtmfBufferTimer = null;
    }

    if (digit === '#') {
      const buffer = this.dtmfBuffer.trim();
      this.dtmfBuffer = '';
      if (buffer.length > 0) {
        this.processKeypadBuffer(buffer);
      }
      return;
    }

    this.dtmfBuffer += digit;

    // After 1200ms of inactivity, process buffered digits
    this.dtmfBufferTimer = setTimeout(() => {
      const buffer = this.dtmfBuffer.trim();
      this.dtmfBuffer = '';
      if (buffer.length > 0) {
        this.processKeypadBuffer(buffer);
      }
    }, 1200);
  }

  private processKeypadBuffer(buffer: string) {
    logger.info(`[KEYPAD] Processing buffered keypad input: "${buffer}"`);
    if (!this.languageSelected && buffer === '1') {
      this.handleDtmfInput('1');
      return;
    }
    if (!this.languageSelected && buffer === '2') {
      this.handleDtmfInput('2');
      return;
    }

    // Only forward as order inquiry if it looks like an order number (2 or more digits, e.g. 101, 102)
    if (buffer.length >= 2) {
      this.executeTurn(`Order ${buffer}`);
    } else {
      logger.info(`[KEYPAD] Ignoring isolated single digit '${buffer}'`);
    }
  }

  /**
   * Plays a direct natural voice confirmation for IVR language selection
   */
  private async playConfirmation(text: string, voiceId: string) {
    this.activeTurnId++;
    this.stopThinkingSound();
    this.clearSafetyTimer();
    this.audioStreamer.cancelPlayback();
    this.sendClear();

    this.state = 'SPEAKING';
    this.audioStreamer.setListening(false);
    this.audioStreamer.setBargeInEnabled(true);
    logger.info(`[VOICE] Playing IVR confirmation: "${text}" with voice ${voiceId}`);

    try {
      const mulaw = await textToSpeech.generateMulawAudio(text, voiceId);
      const completed = await this.audioStreamer.playMulaw(mulaw, 'ai_response_complete');
      if (!completed) {
        return;
      }
      this.clearSafetyTimer();
      this.markSafetyTimer = setTimeout(() => {
        if (this.state === 'SPEAKING') {
          this.transitionToListening();
        }
      }, 800);
    } catch (err: any) {
      logger.error(`[VOICE] Failed to play IVR confirmation: ${err.message}`);
      this.transitionToListening();
    }
  }

  /**
   * Called by AudioStreamer when the caller completes an utterance.
   */
  private async handleSpeechComplete(mulawBuffer: Buffer) {
    if (this.state !== 'LISTENING') {
      return;
    }

    const turnId = ++this.activeTurnId;
    const tStart = Date.now();
    this.state = 'PROCESSING';
    this.audioStreamer.setListening(false);

    // Immediately play soft thinking chime so there is never awkward dead silence!
    this.startThinkingSound();

    try {
      // 1. Convert to text via Groq Whisper STT
      const tSttStart = Date.now();
      const transcript = await speechToText.transcribeMulawBuffer(mulawBuffer);
      const sttMs = Date.now() - tSttStart;

      // Check if this turn is still the active turn (caller didn't barge-in or hang up)
      if (turnId !== this.activeTurnId) {
        logger.info(`[VOICE] Discarding STT from outdated turn ${turnId} (current: ${this.activeTurnId})`);
        return;
      }

      if (!transcript || transcript.trim().length === 0 || transcript.trim() === '.') {
        logger.info('[STT] Empty or noise audio, resuming listening');
        this.stopThinkingSound();
        this.transitionToListening();
        return;
      }

      // Check if caller spoke their language preference (e.g. "English", "1", "Hindi", "2")
      const cleanTranscript = transcript.trim().toLowerCase().replace(/[.,!]/g, '');
      const isEnglishSpoken = cleanTranscript.includes('english') || cleanTranscript === '1' || cleanTranscript === 'one' || cleanTranscript.includes('press 1');
      const isHindiSpoken = cleanTranscript.includes('hindi') || cleanTranscript === '2' || cleanTranscript === 'two' || cleanTranscript.includes('press 2') || cleanTranscript.includes('हिंदी') || cleanTranscript.includes('दो');

      if (!this.languageSelected && isEnglishSpoken) {
        this.languageSelected = true;
        this.currentLanguage = 'en';
        this.voiceId = 'en-IN-NeerjaExpressiveNeural';
        if (this.callSid) {
          callSessionManager.updateVariables(this.callSid, { language: 'en' }).catch(() => {});
          prisma.call.updateMany({
            where: { OR: [{ id: this.callSid }, { twilioCallSid: this.callSid }] },
            data: { language: 'en' }
          }).catch(() => {});
        }
        this.stopThinkingSound();
        this.playConfirmation(
          "English selected. How can I help you today?",
          'en-IN-NeerjaExpressiveNeural'
        );
        return;
      }

      if (!this.languageSelected && isHindiSpoken) {
        this.languageSelected = true;
        this.currentLanguage = 'hi';
        this.voiceId = 'hi-IN-SwaraNeural';
        if (this.callSid) {
          callSessionManager.updateVariables(this.callSid, { language: 'hi' }).catch(() => {});
          prisma.call.updateMany({
            where: { OR: [{ id: this.callSid }, { twilioCallSid: this.callSid }] },
            data: { language: 'hi' }
          }).catch(() => {});
        }
        this.stopThinkingSound();
        this.playConfirmation(
          "नमस्ते! बताइए, मैं आपकी क्या सहायता कर सकता हूँ?",
          'hi-IN-SwaraNeural'
        );
        return;
      }

      // Automatic dynamic language detection for ongoing conversation
      const hasDevanagari = /[\u0900-\u097F]/.test(transcript);
      const isExplicitHindiSpokenNow = cleanTranscript.includes('hindi') || 
        cleanTranscript.includes('हिंदी') || 
        cleanTranscript.includes('angrezi') || 
        cleanTranscript.includes('angreji') ||
        cleanTranscript.includes('talk in hindi') ||
        cleanTranscript.includes('speak in hindi');

      if (hasDevanagari || isExplicitHindiSpokenNow) {
        this.currentLanguage = 'hi';
        this.voiceId = 'hi-IN-SwaraNeural';
        if (this.callSid) {
          callSessionManager.updateVariables(this.callSid, { language: 'hi' }).catch(() => {});
          prisma.call.updateMany({
            where: { OR: [{ id: this.callSid }, { twilioCallSid: this.callSid }] },
            data: { language: 'hi' }
          }).catch(() => {});
        }
      }

      // Execute conversational turn
      await this.executeTurn(transcript, turnId, tStart, sttMs);

    } catch (err: any) {
      logger.error(`[CALL] Error processing caller speech: ${err.message}`);
      if (turnId === this.activeTurnId) {
        this.stopThinkingSound();
        this.transitionToListening();
      }
    }
  }

  /**
   * Executes LLM inference + streaming sentence-by-sentence TTS
   */
  private async executeTurn(transcript: string, existingTurnId?: number, tStartOverride?: number, sttMsOverride?: number) {
    const turnId = existingTurnId ?? ++this.activeTurnId;
    const tStart = tStartOverride ?? Date.now();
    const sttMs = sttMsOverride ?? 0;

    this.state = 'PROCESSING';
    this.audioStreamer.setListening(false);
    this.startThinkingSound();

    let firstChunkSent = false;
    let totalAudioBytes = 0;
    let totalTtsMs = 0;
    let sentenceIndex = 0;

    try {
      logger.info(`[CONVERSATION] processing transcript: "${transcript}"`);
      logger.info(`[VOICE] Caller input: "${transcript}"`);

      logger.info('[LLM] Streaming response & generating speech concurrently');

      const aiResponse = await conversationEngine.processUserInputStreaming(
        this.callSid!,
        transcript,
        this.employeeId,
        async (sentence: string, isFinal: boolean) => {
          if (turnId !== this.activeTurnId) {
            return;
          }

          if (!sentence || sentence.trim().length === 0) {
            if (isFinal && firstChunkSent) {
              this.sendMark('ai_response_complete');
            }
            return;
          }

          if (turnId !== this.activeTurnId) {
            return;
          }

          this.state = 'SPEAKING';
          this.audioStreamer.setBargeInEnabled(true);
          sentenceIndex++;

          // Dynamic human voice selection:
          // If sentence contains Devanagari Hindi characters OR Hindi is selected, speak using Swara.
          // Otherwise, speak using Neerja (expressive, natural human Indian-English voice).
          const hasDevanagari = /[\u0900-\u097F]/.test(sentence);
          const voiceForSentence = (hasDevanagari || this.currentLanguage === 'hi') ? 'hi-IN-SwaraNeural' : this.voiceId;

          const tSentenceTts = Date.now();
          const mulawSentence = await textToSpeech.generateMulawAudio(sentence, voiceForSentence);
          const sentenceTtsMs = Date.now() - tSentenceTts;
          totalTtsMs += sentenceTtsMs;
          totalAudioBytes += mulawSentence.length;

          if (!firstChunkSent) {
            firstChunkSent = true;
            this.stopThinkingSound();
            const ttfa = Date.now() - tStart;
            logger.info(`[LATENCY] >>> TTFA (Time-To-First-Audio): ${ttfa}ms <<< (STT: ${sttMs}ms, First-Sentence TTS: ${sentenceTtsMs}ms | Voice: ${voiceForSentence}) | First Sentence: "${sentence}"`);
            logger.info('[VOICE] Sending audio to caller');
          }

          if (turnId !== this.activeTurnId) {
            return;
          }

          const markName = isFinal ? 'ai_response_complete' : undefined;
          const completed = await this.audioStreamer.playMulaw(mulawSentence, markName);
          if (!completed) {
            logger.debug(`[VOICE] Sentence ${sentenceIndex} interrupted by caller`);
          }
        },
        this.currentLanguage
      );

      if (turnId !== this.activeTurnId) {
        return;
      }

      const totalTurnAround = Date.now() - tStart;
      logger.info(`[LLM] Full response generated: "${aiResponse}"`);
      logger.info(`[LATENCY-SUMMARY] Total Turnaround: ${totalTurnAround}ms | STT: ${sttMs}ms | Cumulative TTS: ${totalTtsMs}ms`);

      if (totalAudioBytes > 0) {
        const audioDurationMs = Math.max(3000, (totalAudioBytes / 8000) * 1000 + 4000);
        this.clearSafetyTimer();
        this.markSafetyTimer = setTimeout(() => {
          if (this.state === 'SPEAKING' && turnId === this.activeTurnId) {
            logger.info('[VOICE] Response completed (fallback safety timer fired)');
            this.transitionToListening();
          }
        }, audioDurationMs);
      }

    } catch (err: any) {
      logger.error(`[CALL] Error executing turn: ${err.message}`);
    } finally {
      if (turnId === this.activeTurnId) {
        this.stopThinkingSound();
        if (!firstChunkSent && this.state === 'PROCESSING') {
          logger.warn('[VOICE] Turn ended without audio output — auto recovering to LISTENING');
          this.transitionToListening();
        }
      }
    }
  }

  private startThinkingSound() {
    if (this.isThinkingSoundActive) return;
    this.isThinkingSoundActive = true;

    // Thinking sound safety timeout: stop background chime after 18 seconds so it never loops forever
    this.thinkingMaxTimer = setTimeout(() => {
      if (this.isThinkingSoundActive) {
        logger.info('[VOICE] Thinking sound reached timeout — stopping chime');
        this.stopThinkingSound();
      }
    }, 18000);

    // Grace period of 350ms: if the answer is generated instantly, NO chime ever sounds!
    this.thinkingTimeout = setTimeout(() => {
      if (!this.isThinkingSoundActive || this.state !== 'PROCESSING') return;
      logger.info('[VOICE] Processing taking > 350ms — playing soft thinking chime');

      const chimeBuffer = thinkingSoundGenerator.getChimeBuffer();
      let offset = 0;
      const CHUNK_SIZE = 640; // 80ms chunks of 8000Hz audio

      this.thinkingInterval = setInterval(() => {
        if (!this.isThinkingSoundActive || this.state !== 'PROCESSING') {
          this.stopThinkingSound();
          return;
        }

        if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
          const chunk = chimeBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, chimeBuffer.length));
          this.sendMedia(chunk.toString('base64'));

          offset += CHUNK_SIZE;
          if (offset >= chimeBuffer.length) {
            offset = 0; // Loop seamlessly
          }
        }
      }, 80);
    }, 350);
  }

  private stopThinkingSound() {
    if (this.thinkingTimeout) {
      clearTimeout(this.thinkingTimeout);
      this.thinkingTimeout = null;
    }
    if (this.thinkingMaxTimer) {
      clearTimeout(this.thinkingMaxTimer);
      this.thinkingMaxTimer = null;
    }
    if (!this.isThinkingSoundActive && !this.thinkingInterval) return;
    this.isThinkingSoundActive = false;
    if (this.thinkingInterval) {
      clearInterval(this.thinkingInterval);
      this.thinkingInterval = null;
      logger.info('[VOICE] Stopped thinking chime — answer ready');
    }
  }

  private sendClear() {
    if (this.ws.readyState === WebSocket.OPEN && this.streamSid) {
      this.ws.send(JSON.stringify({
        event: 'clear',
        streamSid: this.streamSid,
      }));
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
    if (this.dtmfBufferTimer) {
      clearTimeout(this.dtmfBufferTimer);
      this.dtmfBufferTimer = null;
    }
    this.stopThinkingSound();
    this.clearSafetyTimer();
    this.audioStreamer.stop();

    if (this.callSid) {
      await callSessionManager.endSession(this.callSid, 'COMPLETED', 0).catch(() => null);
    }
  }
}
