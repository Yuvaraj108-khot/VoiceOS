import { logger } from '../lib/logger';
import { callSessionManager } from '../telephony/CallSessionManager';
import { memoryManager } from './MemoryManager';
import { promptBuilder } from './PromptBuilder';
import { contextRetriever } from './ContextRetriever';
import { chatCompletion, streamChatCompletion, ChatMessage } from '../lib/groq';
import { callEventEmitter } from '../realtime/CallEventEmitter';
import { prisma } from '../lib/prisma';
import { executeLookupBusinessData } from './tools/lookupBusinessData';
import { slotFillingEngine } from './SlotFillingEngine';

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export class ConversationEngine {
  private orgIdCache = new Map<string, string>();
  private callCache = new Map<string, { organizationId: string; id: string }>();
  private dataProfileCache = new Map<string, { profile: any; expiry: number }>();

  private async getCallInfo(callId: string): Promise<{ organizationId: string; id: string } | null> {
    if (!callId) return null;
    if (this.callCache.has(callId)) return this.callCache.get(callId)!;
    try {
      const call = await prisma.call.findFirst({
        where: isUuid(callId)
          ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
          : { twilioCallSid: callId },
        select: { organizationId: true, id: true }
      });
      if (call) {
        this.callCache.set(callId, call);
        this.orgIdCache.set(callId, call.organizationId);
        return call;
      }
    } catch { /* ignore */ }
    return null;
  }

  /**
   * Helper to extract business entity identifiers (e.g. ORD1002, INV-881, 1002)
   */
  private extractIdentifier(userInput: string, history: any[]): string | null {
    return slotFillingEngine.extractIdentifier(userInput);
  }

  /**
   * Resolves the organizationId for a call or session.
   */
  private async resolveOrgId(callId: string, employeeId?: string): Promise<string> {
    if (callId && this.orgIdCache.has(callId)) {
      return this.orgIdCache.get(callId)!;
    }

    const info = await this.getCallInfo(callId);
    if (info?.organizationId) return info.organizationId;

    if (employeeId && isUuid(employeeId)) {
      try {
        const emp = await prisma.aIEmployee.findUnique({
          where: { id: employeeId },
          select: { organizationId: true }
        });
        if (emp?.organizationId) return emp.organizationId;
      } catch { /* ignore */ }
    }

    const defaultOrg = await prisma.organization.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' }
    });
    return defaultOrg?.id || '';
  }

  /**
   * Main entry point for transcribed audio text during a call (non-streaming).
   */
  async processUserInput(callId: string, userInput: string, fallbackEmployeeId?: string): Promise<string> {
    try {
      const session = await callSessionManager.getSession(callId);
      let employeeId = session?.employeeId || fallbackEmployeeId;

      if (!employeeId) {
        const emp = await prisma.aIEmployee.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'asc' }
        }).catch(() => null);
        employeeId = emp?.id || '';
      }

      const orgId = await this.resolveOrgId(callId, employeeId);

      // 1. Add user input to memory
      await memoryManager.addMessage(callId, { role: 'user', content: userInput });
      const conversationHistory = await memoryManager.getHistory(callId);

      // Emit live transcript for caller
      try {
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const call = await prisma.call.findFirst({
          where: isUuid(callId)
            ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
            : { twilioCallSid: callId },
          select: { organizationId: true, id: true }
        });
        if (call) {
          callEventEmitter.emitLiveTranscript(call.organizationId, call.id, 'user', userInput);
        }
      } catch { /* ignore */ }

      // 2. Identify active context or extract identifier (ID, phone, email, or name)
      const activeContextId = session?.variables?.active_context_id || session?.variables?.active_order_id || null;

      // Only trigger a data lookup if the user utterance is actually asking about a
      // specific entity (order, status, delivery, etc.) OR is providing an identifier
      // after being asked. General questions like "what are your plans?" should NEVER
      // trigger a lookup and should never get the NOT_FOUND directive back.
      const { isEntityQuery: isEntityInquiry } = slotFillingEngine.isEntityInquiry(userInput);
      const extractedIdentifier = slotFillingEngine.extractIdentifier(userInput);

      // Strict follow-up: only re-use context id if the sentence is purely a follow-up
      // pronoun (e.g. "when will it arrive?") — NOT just because "my" or "the" appeared.
      const isStrictFollowUp = /^\s*(it|that|this|same|current)\b/i.test(userInput) ||
        /\b(it|that|this)\s+(arrive|ship|deliver|come|status|amount|cost|price|total)\b/i.test(userInput);

      // Only resolve an identifier if we actually have a real entity query context
      const resolvedIdentifier =
        extractedIdentifier ||
        ((isStrictFollowUp || isEntityInquiry) && activeContextId ? activeContextId : null);

      let verifiedDataResult: string | undefined = undefined;

      // Only do a DB lookup when user is genuinely asking about a specific record
      if (resolvedIdentifier && orgId && (isEntityInquiry || extractedIdentifier)) {
        logger.info(
          `[ConversationEngine] Exact data lookup triggered for identifier "${resolvedIdentifier}"`
        );
        verifiedDataResult = await executeLookupBusinessData(orgId, {
          identifier: resolvedIdentifier
        });

        try {
          const parsed = JSON.parse(verifiedDataResult);
          if (parsed.found) {
            await callSessionManager.updateVariables(callId, {
              active_context_id: resolvedIdentifier,
              active_order_id: resolvedIdentifier
            });
          } else {
            // If the lookup found nothing AND the user was NOT explicitly asking
            // about a record (e.g. just said "I want to know about your plans"),
            // discard the failed lookup result so the LLM isn't told to ask for IDs.
            if (!isEntityInquiry) {
              verifiedDataResult = undefined;
            }
          }
        } catch {}
      }

      // 3. Static Knowledge RAG context
      const context = await contextRetriever.retrieveContext(employeeId, userInput);

      // Detect language
      const hasDevanagari = /[\u0900-\u097F]/.test(userInput);
      const isExplicitHindiSpoken = /\b(hindi|हिंदी|angrezi|angreji|me baat|mein baat)\b/i.test(userInput);
      const isHindi = session?.variables?.language === 'hi' || hasDevanagari || isExplicitHindiSpoken;

      if (isHindi && session?.variables?.language !== 'hi') {
        callSessionManager.updateVariables(callId, { language: 'hi' }).catch(() => {});
        this.getCallInfo(callId).then(c => {
          if (c) prisma.call.update({ where: { id: c.id }, data: { language: 'hi' } }).catch(() => {});
        }).catch(() => {});
      }

      // 4. Build prompt with RAG + Verified Business Data
      const systemPrompt = await promptBuilder.buildSystemPrompt(
        employeeId,
        context,
        session?.variables || {},
        verifiedDataResult,
        isHindi ? 'hi' : 'en'
      );

      // 5. Call Groq LLM
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((h: any) => ({
          role: h.role as 'user' | 'system' | 'assistant',
          content: h.content
        }))
      ];

      if (isHindi) {
        messages.push({
          role: 'system',
          content: 'MANDATORY INSTRUCTION: You MUST answer the caller 100% in HINDI (हिंदी / Hinglish). NEVER speak in English or apologize in English. Every word must be Hindi.'
        });
      }

      let aiResponse = await streamChatCompletion(messages, { maxTokens: 512 });
      aiResponse = (aiResponse || '').trim();

      // Clean up markdown formatting symbols so TTS speaks naturally
      aiResponse = aiResponse
        .replace(/[*_#`~[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!aiResponse) {
        aiResponse = "I understand. Please go ahead.";
      }

      // 6. Add AI response to memory
      await memoryManager.addMessage(callId, { role: 'assistant', content: aiResponse });

      // Emit live transcript for assistant
      try {
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const call = await prisma.call.findFirst({
          where: isUuid(callId)
            ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
            : { twilioCallSid: callId },
          select: { organizationId: true, id: true }
        });
        if (call) {
          callEventEmitter.emitLiveTranscript(call.organizationId, call.id, 'assistant', aiResponse);
        }
      } catch { /* ignore */ }

      return aiResponse;
    } catch (error) {
      logger.error(`Error in ConversationEngine for call ${callId}: ${error}`);
      return "I'm sorry, I'm having trouble processing that right now. Could you repeat?";
    }
  }

  /**
   * Low-latency streaming method that yields clean sentences as they are generated by Groq LLM.
   * Fully supports exact structured data lookups and smart slot-filling without losing streaming!
   */
  async processUserInputStreaming(
    callId: string,
    userInput: string,
    fallbackEmployeeId: string | undefined,
    onSentence: (sentence: string, isFinal: boolean) => Promise<void>,
    preferredLanguage?: 'en' | 'hi'
  ): Promise<string> {
    try {
      const session = await callSessionManager.getSession(callId);
      let employeeId = session?.employeeId || fallbackEmployeeId;

      if (!employeeId) {
        const emp = await prisma.aIEmployee.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' }
        }).catch(() => null);
        employeeId = emp?.id || '';
      }

      const orgId = await this.resolveOrgId(callId, employeeId);

      // Detect language
      const hasDevanagari = /[\u0900-\u097F]/.test(userInput);
      const isExplicitHindiSpoken = /\b(hindi|हिंदी|angrezi|angreji|me baat|mein baat|samajh nahi|samajh nhi)\b/i.test(userInput);
      const isHindi = preferredLanguage === 'hi' || session?.variables?.language === 'hi' || hasDevanagari || isExplicitHindiSpoken;

      if (isHindi && session?.variables?.language !== 'hi') {
        callSessionManager.updateVariables(callId, { language: 'hi' }).catch(() => {});
        this.getCallInfo(callId).then(c => {
          if (c) prisma.call.update({ where: { id: c.id }, data: { language: 'hi' } }).catch(() => {});
        }).catch(() => {});
      }

      // 1. Add user input to memory
      await memoryManager.addMessage(callId, { role: 'user', content: userInput });
      const conversationHistory = await memoryManager.getHistory(callId);

      // Emit live transcript for caller
      this.getCallInfo(callId).then(call => {
        if (call) {
          callEventEmitter.emitLiveTranscript(call.organizationId, call.id, 'user', userInput);
          prisma.callTranscript.create({
            data: { callId: call.id, speaker: 'caller', text: userInput }
          }).catch(() => {});
        }
      }).catch(() => {});

      // 2. Identify active context or extract identifier (ID, phone, email, or name)
      const activeContextId = session?.variables?.active_context_id || session?.variables?.active_order_id || null;

      const { isEntityQuery: isEntityInquiryStreaming } = slotFillingEngine.isEntityInquiry(userInput);
      const extractedIdentifier = slotFillingEngine.extractIdentifier(userInput);

      const isStrictFollowUpStreaming = /^\s*(it|that|this|same|current)\b/i.test(userInput) ||
        /\b(it|that|this)\s+(arrive|ship|deliver|come|status|amount|cost|price|total)\b/i.test(userInput);

      const resolvedIdentifier =
        extractedIdentifier ||
        ((isStrictFollowUpStreaming || isEntityInquiryStreaming) && activeContextId ? activeContextId : null);

      let verifiedDataResult: string | undefined = undefined;

      if (resolvedIdentifier && orgId && (isEntityInquiryStreaming || extractedIdentifier)) {
        logger.info(
          `[ConversationEngine Streaming] Exact data lookup triggered for identifier "${resolvedIdentifier}"`
        );

        // Provide immediate sub-second verbal feedback while querying data
        const verbalFeedback = isHindi ? "जी, मैं अभी चेक करके बताता हूँ।" : "Let me check that for you right away.";
        await onSentence(verbalFeedback, false);

        verifiedDataResult = await executeLookupBusinessData(orgId, {
          identifier: resolvedIdentifier
        });

        try {
          const parsed = JSON.parse(verifiedDataResult);
          if (parsed.found) {
            await callSessionManager.updateVariables(callId, {
              active_context_id: resolvedIdentifier,
              active_order_id: resolvedIdentifier
            });
          } else {
            if (!isEntityInquiryStreaming) {
              verifiedDataResult = undefined;
            }
          }
        } catch {}
      }

      // 3. Static Knowledge RAG context
      const context = await contextRetriever.retrieveContext(employeeId, userInput);

      // 4. Build prompt
      const systemPrompt = await promptBuilder.buildSystemPrompt(
        employeeId,
        context,
        session?.variables || {},
        verifiedDataResult,
        isHindi ? 'hi' : 'en'
      );

      // 5. Stream Groq LLM tokens with sentence-level chunking
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map((h: any) => ({
          role: h.role as 'user' | 'system' | 'assistant',
          content: h.content
        }))
      ];

      if (isHindi) {
        messages.push({
          role: 'system',
          content: 'MANDATORY INSTRUCTION: You MUST answer the caller 100% in HINDI (हिंदी / Hinglish). NEVER speak in English or apologize in English. Every word must be Hindi.'
        });
      }

      let fullAiResponse = '';
      let sentenceBuffer = '';
      let firstChunkTriggered = false;

      const sanitizeSentence = (s: string): string => {
        if (!isHindi) return s;
        if (/^(oh,?\s*)?sorry!?,?\s*i was speaking in english/i.test(s)) {
          return "माफ़ कीजिए! अब से मैं केवल हिंदी में बात करूँगा। बताइए मैं आपकी क्या सहायता करूँ?";
        }
        if (/^i will (switch to|speak only in) hindi/i.test(s)) {
          return "जी बिल्कुल, मैं हिंदी में ही बात करूँगा। कृपया अपना नंबर या ईमेल बताएं।";
        }
        if (/^i am (very )?sorry for the (confusion|misunderstanding)/i.test(s)) {
          return "माफ़ कीजिए! कृपया अपना नंबर बताएं, मैं आपका ऑर्डर तुरंत चेक कर देता हूँ।";
        }
        if (/^please share your registered (phone|number|email)/i.test(s)) {
          return "कृपया अपना रजिस्टर्ड फ़ोन नंबर या ईमेल बताएं।";
        }
        return s;
      };

      await streamChatCompletion(messages, {
        maxTokens: 120, // Short, crisp voice responses — no long monologues!
        temperature: 0.35,
        onChunk: async (delta: string) => {
          fullAiResponse += delta;
          sentenceBuffer += delta;

          // Match natural sentence boundaries: . ! ? ; or newline
          const match = sentenceBuffer.match(/^(.*?[.?!;\n]+)(?:\s+(.*)|$)/s);
          if (match && match[1].trim().length >= 4) {
            const rawSentence = match[1].trim();
            sentenceBuffer = match[2] || '';
            firstChunkTriggered = true;

            const cleanSentence = rawSentence
              .replace(/[*_#`~[\]]/g, '')
              .replace(/\n+/g, ' ')
              .trim();

            const finalSentence = sanitizeSentence(cleanSentence);
            if (finalSentence.length >= 2) {
              await onSentence(finalSentence, false);
            }
          }
        }
      });

      // Flush remaining buffer
      const remainingClean = sentenceBuffer
        .replace(/[*_#`~[\]]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      const finalRemaining = sanitizeSentence(remainingClean);
      if (finalRemaining.length > 0) {
        await onSentence(finalRemaining, true);
      } else if (!firstChunkTriggered && fullAiResponse.trim().length > 0) {
        await onSentence(sanitizeSentence(fullAiResponse.trim()), true);
      } else {
        await onSentence('', true);
      }

      fullAiResponse = fullAiResponse.replace(/[*_#`~[\]]/g, '').trim();
      if (!fullAiResponse) {
        fullAiResponse = isHindi ? "जी, मैं सुन रहा हूँ। कृपया बताएं।" : "I understand. Please go ahead.";
      }

      // 6. Add AI response to memory
      await memoryManager.addMessage(callId, { role: 'assistant', content: fullAiResponse });

      // Emit live transcript for assistant
      try {
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        const call = await prisma.call.findFirst({
          where: isUuid(callId)
            ? { OR: [{ id: callId }, { twilioCallSid: callId }] }
            : { twilioCallSid: callId },
          select: { organizationId: true, id: true }
        });
        if (call) {
          callEventEmitter.emitLiveTranscript(call.organizationId, call.id, 'assistant', fullAiResponse);
          prisma.callTranscript.create({
            data: {
              callId: call.id,
              speaker: 'assistant',
              text: fullAiResponse
            }
          }).catch(() => {});
        }
      } catch { /* ignore */ }

      return fullAiResponse;
    } catch (error) {
      logger.error(`Error in ConversationEngine streaming for call ${callId}: ${error}`);
      const fallback = "I'm sorry, I'm having trouble processing that right now. Could you repeat?";
      await onSentence(fallback, true);
      return fallback;
    }
  }

  private async getOrgDataProfile(orgId?: string): Promise<{ hasStructuredDocs: boolean; entityLabel: string }> {
    if (!orgId) return { hasStructuredDocs: false, entityLabel: 'reference ID' };
    const now = Date.now();
    if (this.dataProfileCache.has(orgId)) {
      const cached = this.dataProfileCache.get(orgId)!;
      if (cached.expiry > now) {
        return cached.profile;
      }
    }

    try {
      const docs = await prisma.knowledgeDocument.findMany({
        where: {
          organizationId: orgId,
          type: { in: ['XLSX', 'CSV', 'SPREADSHEET'] },
          status: 'READY',
          deletedAt: null
        },
        select: { name: true, metadata: true }
      });

      if (docs.length === 0) {
        return { hasStructuredDocs: false, entityLabel: 'reference ID' };
      }

      for (const d of docs) {
        const meta = d.metadata as any;
        const nameLower = (d.name || '').toLowerCase();
        if (nameLower.includes('order') || nameLower.includes('deliver') || nameLower.includes('shipping')) {
          return { hasStructuredDocs: true, entityLabel: 'order ID' };
        } else if (nameLower.includes('patient') || nameLower.includes('clinic') || nameLower.includes('doctor')) {
          return { hasStructuredDocs: true, entityLabel: 'patient ID' };
        } else if (nameLower.includes('appoint') || nameLower.includes('book')) {
          return { hasStructuredDocs: true, entityLabel: 'booking reference' };
        } else if (nameLower.includes('ticket') || nameLower.includes('issue')) {
          return { hasStructuredDocs: true, entityLabel: 'ticket number' };
        } else if (nameLower.includes('invoice') || nameLower.includes('bill')) {
          return { hasStructuredDocs: true, entityLabel: 'invoice number' };
        } else if (meta?.primaryKey) {
          const prof = { hasStructuredDocs: true, entityLabel: String(meta.primaryKey).replace(/_/g, ' ') };
          this.dataProfileCache.set(orgId, { profile: prof, expiry: now + 300000 });
          return prof;
        }
      }

      const defaultProf = { hasStructuredDocs: docs.length > 0, entityLabel: 'reference ID' };
      this.dataProfileCache.set(orgId, { profile: defaultProf, expiry: now + 300000 });
      return defaultProf;
    } catch {
      return { hasStructuredDocs: false, entityLabel: 'reference ID' };
    }
  }

  async handleCallStart(callId: string): Promise<string> {
    logger.info(`Conversation started for call ${callId}`);
    return "Hi! Thanks for reaching out. I'm Yuvaraj, your AI Sales Development Representative. How can I help you today?";
  }

  async handleCallEnd(callId: string) {
    logger.info(`Conversation ended for call ${callId}`);
  }
}

export const conversationEngine = new ConversationEngine();
