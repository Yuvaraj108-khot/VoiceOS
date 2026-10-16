import { logger } from '../lib/logger';

export interface PendingRequest {
  intent: string;
  requiredSlots: string[];
  collectedSlots: Record<string, string>;
  originalUserRequest: string;
  createdAt: number;
}

export interface SlotAnalysisResult {
  hasActiveIdentifier: boolean;
  resolvedIdentifier: string | null;
  isNewIdentifier: boolean;
  requiresClarification: boolean;
  clarificationMessage?: string;
  pendingRequest?: PendingRequest | null;
  effectiveUserQuery: string;
}

export class SlotFillingEngine {
  /**
   * Extract business identifier (e.g. ORD1002, 1002, INV-881, #1002) from user utterance.
   */
  extractIdentifier(userInput: string): string | null {
    if (!userInput || userInput.trim().length === 0) return null;

    // 1. Matches standard entity prefixes: e.g. "ORD1002", "INV123", "TRK-981", "APT101", "PAT55"
    const specificPrefixRegex = /\b(ORD|INV|TRK|PO|CUST|ITEM|APT|PAT|TKT|RES|BK)\s*[-_]?\s*([0-9]{2,8})\b/i;
    const specificMatch = userInput.match(specificPrefixRegex);
    if (specificMatch) {
      return `${specificMatch[1].toUpperCase()}${specificMatch[2]}`;
    }

    // 2. Hash notation: e.g. #1002 or #ORD1002
    const hashMatch = userInput.match(/#\s*([a-zA-Z]{2,4})?\s*([0-9]{3,8})\b/i);
    if (hashMatch) {
      const prefix = hashMatch[1] ? hashMatch[1].toUpperCase() : 'ORD';
      return `${prefix}${hashMatch[2]}`;
    }

    // 3. Matches general 2-4 letter prefix followed by digits, excluding common English stopwords
    const generalPrefixRegex = /\b([a-zA-Z]{2,4})\s*[-_]?\s*([0-9]{3,8})\b/i;
    const genMatch = userInput.match(generalPrefixRegex);
    if (genMatch) {
      const prefix = genMatch[1].toLowerCase();
      const stopwords = ['is', 'it', 'to', 'in', 'on', 'at', 'by', 'for', 'of', 'or', 'my', 'me', 'we', 'he'];
      if (!stopwords.includes(prefix)) {
        return `${genMatch[1].toUpperCase()}${genMatch[2]}`;
      }
    }

    // 4. Matches explicit "order <number>", "order number <number>"
    const orderPrefixMatch = userInput.match(/\border\s*(?:number|id|code)?\s*[:#]?\s*([0-9]{3,8})\b/i);
    if (orderPrefixMatch) {
      return `ORD${orderPrefixMatch[1]}`;
    }

    // 5. Matches general "id <number>", "number <number>", "it's <number>", or pure 3-8 digit numbers
    const generalNumMatch = userInput.match(/(?:(?:id|number|code|ref|it's|it\s*is)\s*[:#]?\s*)?\b([0-9]{3,8})\b/i);
    if (generalNumMatch) {
      return `ORD${generalNumMatch[1]}`;
    }

    return null;
  }

  /**
   * Determines if the user utterance is an entity-specific inquiry (e.g., status, delivery, items, amount)
   * that requires a specific business identifier.
   */
  isEntityInquiry(userInput: string, hasStructuredDocs: boolean = true): { isEntityQuery: boolean; intent: string } {
    if (!hasStructuredDocs) {
      return { isEntityQuery: false, intent: 'general_query' };
    }

    const text = userInput.toLowerCase();

    // Intent patterns
    const isDelivery = /\b(delivery|arrive|arriving|expected|shipping|shipped|reach|when will|when do I expect|track|tracking|package)\b/i.test(text);
    const isStatus = /\b(status|where is|progress|update on|what's happening with|check on)\b/i.test(text);
    const isAmount = /\b(amount|cost|price|total|how much|bill|charge|pay|paid)\b/i.test(text);
    const isCustomer = /\b(who is the customer|customer name|who ordered|whose order|belongs to)\b/i.test(text);
    const isGeneralOrder = /\b(order|purchase|item|package)\b/i.test(text);

    if (isDelivery) {
      return { isEntityQuery: true, intent: 'delivery_date' };
    }
    if (isStatus) {
      return { isEntityQuery: true, intent: 'entity_status' };
    }
    if (isAmount) {
      return { isEntityQuery: true, intent: 'entity_amount' };
    }
    if (isCustomer) {
      return { isEntityQuery: true, intent: 'entity_customer' };
    }
    if (isGeneralOrder) {
      return { isEntityQuery: true, intent: 'entity_inquiry' };
    }

    return { isEntityQuery: false, intent: 'general_query' };
  }

  /**
   * Generates a concise, natural, phone-friendly clarification question.
   */
  getClarificationQuestion(intent: string, entityLabel: string = 'reference ID'): string {
    switch (intent) {
      case 'delivery_date':
        return `Sure, I can check that for you. What is your ${entityLabel}?`;
      case 'entity_status':
        return `I can check that for you. What is your ${entityLabel}?`;
      case 'entity_amount':
        return `I can check that amount for you. Could you share your ${entityLabel}?`;
      case 'entity_customer':
        return `Sure, which ${entityLabel} are you inquiring about?`;
      default:
        return `Sure, I can look that up for you. What is your ${entityLabel}?`;
    }
  }

  /**
   * Analyzes the conversation turn, extracts or resumes slots, determines if clarification
   * is required, or provides the effective query and resolved identifier for execution.
   */
  processTurn(
    userInput: string,
    history: any[],
    activeContextId?: string | null,
    pendingRequest?: PendingRequest | null,
    options?: {
      hasStructuredDocs?: boolean;
      entityLabel?: string;
    }
  ): SlotAnalysisResult {
    const hasStructuredDocs = options?.hasStructuredDocs ?? true;
    const entityLabel = options?.entityLabel ?? 'reference ID';

    const rawIdInUtterance = this.extractIdentifier(userInput);

    // CASE 1: Direct identifier provided in current utterance (e.g. "What is the status of ORD1002?" or "ORD1002")
    if (rawIdInUtterance) {
      let effectiveQuery = userInput;

      // If we had a pending request, fulfill it now!
      if (pendingRequest && pendingRequest.originalUserRequest) {
        logger.info(
          `[SlotFilling] Fulfilling pending request "${pendingRequest.originalUserRequest}" with slot identifier="${rawIdInUtterance}"`
        );
        effectiveQuery = `${pendingRequest.originalUserRequest} (${entityLabel}: ${rawIdInUtterance})`;
      }

      return {
        hasActiveIdentifier: true,
        resolvedIdentifier: rawIdInUtterance,
        isNewIdentifier: rawIdInUtterance !== activeContextId,
        requiresClarification: false,
        pendingRequest: null, // Cleared on fulfillment
        effectiveUserQuery: effectiveQuery
      };
    }

    // CASE 2: Check if this is small talk, greeting, or general question (never treat as entity lookup query)
    const isSmallTalkOrGeneral = /\b(good\s*(morning|afternoon|evening|day|night)|hello|hi|hey|how are you|who are you|what(?:'s|\s+is)\s+(?:your|this|the)\s+company|what do you do|tell me|joke|code|python|print)\b/i.test(userInput);

    if (isSmallTalkOrGeneral) {
      return {
        hasActiveIdentifier: false,
        resolvedIdentifier: null,
        isNewIdentifier: false,
        requiresClarification: false,
        pendingRequest: null,
        effectiveUserQuery: userInput
      };
    }

    // CASE 3: No identifier in current utterance — check if this is an explicit follow-up ("it", "when will it arrive", "what's the amount")
    const { isEntityQuery, intent } = this.isEntityInquiry(userInput, hasStructuredDocs);
    const isFollowUpPronoun = /\b(it|that|this|same|my order|the order|package|delivery|amount|status)\b/i.test(userInput);

    // If caller explicitly references prior entity and we have an active context ID
    if (activeContextId && (isEntityQuery || isFollowUpPronoun)) {
      logger.info(
        `[SlotFilling] Re-using active conversational context identifier "${activeContextId}" for follow-up query`
      );
      return {
        hasActiveIdentifier: true,
        resolvedIdentifier: activeContextId,
        isNewIdentifier: false,
        requiresClarification: false,
        pendingRequest: null,
        effectiveUserQuery: `${userInput} (Reference: ${activeContextId})`
      };
    }

    // Also scan recent conversation history for previously mentioned identifier
    if (isFollowUpPronoun && history && history.length > 0) {
      for (let i = history.length - 1; i >= 0; i--) {
        const histMsg = history[i].content || '';
        const histId = this.extractIdentifier(histMsg);
        if (histId) {
          logger.info(`[SlotFilling] Resolved identifier "${histId}" from conversation history`);
          return {
            hasActiveIdentifier: true,
            resolvedIdentifier: histId,
            isNewIdentifier: false,
            requiresClarification: false,
            pendingRequest: null,
            effectiveUserQuery: `${userInput} (Reference: ${histId})`
          };
        }
      }
    }

    // CASE 4: User is asking for entity/business data but NO identifier is known -> Slot is MISSING
    if (isEntityQuery) {
      const newPendingRequest: PendingRequest = {
        intent,
        requiredSlots: [entityLabel],
        collectedSlots: {},
        originalUserRequest: userInput,
        createdAt: Date.now()
      };

      const clarification = this.getClarificationQuestion(intent, entityLabel);
      logger.info(
        `[SlotFilling] Missing required slot "${entityLabel}" for intent "${intent}". Prompting clarification: "${clarification}"`
      );

      return {
        hasActiveIdentifier: false,
        resolvedIdentifier: null,
        isNewIdentifier: false,
        requiresClarification: true,
        clarificationMessage: clarification,
        pendingRequest: newPendingRequest,
        effectiveUserQuery: userInput
      };
    }

    // CASE 5: General question (e.g. policy, greeting, general company info)
    return {
      hasActiveIdentifier: false,
      resolvedIdentifier: null,
      isNewIdentifier: false,
      requiresClarification: false,
      pendingRequest: null,
      effectiveUserQuery: userInput
    };
  }
}

export const slotFillingEngine = new SlotFillingEngine();
