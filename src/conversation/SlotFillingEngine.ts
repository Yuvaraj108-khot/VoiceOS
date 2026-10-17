import { logger } from '../lib/logger';
import { SpeechNormalizer } from '../utils/SpeechNormalizer';

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
   * Detects if the user expresses that they don't know, don't remember, or don't have an ID,
   * or asks if they can provide phone/email/name/other options instead.
   */
  isIdentifierUnavailable(userInput: string): boolean {
    if (!userInput) return false;
    const text = userInput.toLowerCase();
    return (
      /\b(don't|do not|can't|cannot|didn't|did not)\s+(know|remember|have|recall|find)\b/i.test(text) ||
      /\b(not\s+sure|no\s+idea|forgot|forgotten|lost|haven't\s+got)\b/i.test(text) ||
      /\b(don't\s+have\s+(?:an?\s+)?(?:id|number|code|order|ref|details))\b/i.test(text) ||
      /\b(check|search|look\s*up|find)\s+(?:with|by|using)\s+(?:my\s+)?(phone|number|mobile|email|name)\b/i.test(text) ||
      /\b(can\s+you\s+check\s+by|use\s+my\s+phone|use\s+my\s+email|use\s+my\s+name)\b/i.test(text) ||
      /\b(what\s+if\s+i\s+don't|any\s+other\s+way|other\s+plans|other\s+options|what\s+else\s+can\s+i\s+provide)\b/i.test(text)
    );
  }

  /**
   * Extract business identifier (e.g. ORD1002, 1002, phone number, email, or customer name) from user utterance.
   */
  extractIdentifier(userInput: string): string | null {
    if (!userInput || userInput.trim().length === 0) return null;

    // A. Use SpeechNormalizer to catch spoken numbers, spoken emails, and accents
    const normalizedId = SpeechNormalizer.extractSpokenIdentifier(userInput);
    if (normalizedId) {
      return normalizedId;
    }

    // 1. Email address match (e.g. "rahul@example.com")
    const emailMatch = userInput.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    if (emailMatch) {
      return emailMatch[1].toLowerCase();
    }

    // 2. Phone number match (10 digits or with country code, e.g. "9876540102", "+919876540102")
    const phoneMatch = userInput.match(/(?:\+?\d{1,3}[-.\s]?)?([6-9]\d{9})\b/) ||
                       userInput.match(/\b(\d{10})\b/);
    if (phoneMatch) {
      return phoneMatch[1];
    }

    // 3. Customer name match if introduced (e.g. "My name is Yuvaraj Khot", "It's for Rahul Sharma")
    const nameMatch = userInput.match(/(?:my name is|name is|i am|this is|under the name of|under|for|check for)\s+([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){1,2})\b/i);
    if (nameMatch) {
      const candidateName = nameMatch[1].trim();
      const forbidden = ['my order', 'the order', 'an order', 'a delivery', 'the status', 'customer service'];
      if (!forbidden.includes(candidateName.toLowerCase())) {
        return candidateName;
      }
    }

    // 4. Matches standard entity prefixes: e.g. "ORD1002", "INV123", "TRK-981", "APT101", "PAT55"
    const specificPrefixRegex = /\b(ORD|INV|TRK|PO|CUST|ITEM|APT|PAT|TKT|RES|BK)\s*[-_]?\s*([0-9]{2,8})\b/i;
    const specificMatch = userInput.match(specificPrefixRegex);
    if (specificMatch) {
      return `${specificMatch[1].toUpperCase()}${specificMatch[2]}`;
    }

    // 5. Hash notation: e.g. #1002 or #ORD1002
    const hashMatch = userInput.match(/#\s*([a-zA-Z]{2,4})?\s*([0-9]{3,8})\b/i);
    if (hashMatch) {
      const prefix = hashMatch[1] ? hashMatch[1].toUpperCase() : 'ORD';
      return `${prefix}${hashMatch[2]}`;
    }

    // 6. Matches explicit "order <number>", "order number <number>"
    const orderPrefixMatch = userInput.match(/\border\s*(?:number|id|code)?\s*[:#]?\s*([0-9]{3,8})\b/i);
    if (orderPrefixMatch) {
      return `ORD${orderPrefixMatch[1]}`;
    }

    // 7. General 2-4 letter prefix followed by digits
    const generalPrefixRegex = /\b([a-zA-Z]{2,4})\s*[-_]?\s*([0-9]{3,8})\b/i;
    const genMatch = userInput.match(generalPrefixRegex);
    if (genMatch) {
      const prefix = genMatch[1].toLowerCase();
      const stopwords = ['is', 'it', 'to', 'in', 'on', 'at', 'by', 'for', 'of', 'or', 'my', 'me', 'we', 'he'];
      if (!stopwords.includes(prefix)) {
        return `${genMatch[1].toUpperCase()}${genMatch[2]}`;
      }
    }

    // 8. Matches general standalone number or "id <number>"
    const generalNumMatch = userInput.match(/(?:(?:id|number|code|ref|it's|it\s*is)\s*[:#]?\s*)\b([0-9]{3,8})\b/i);
    if (generalNumMatch) {
      return generalNumMatch[1];
    }

    const standaloneMatch = userInput.trim().match(/^([0-9]{3,8})$/);
    if (standaloneMatch) {
      return standaloneMatch[1];
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
   * Generates a warm, conversational clarification question that already offers alternatives (phone/email).
   */
  getClarificationQuestion(intent: string, entityLabel: string = 'reference ID'): string {
    switch (intent) {
      case 'delivery_date':
        return `I'd be glad to check your delivery! Could you share your ${entityLabel}, or your registered phone number or email?`;
      case 'entity_status':
        return `I can check that for you! Could you share your ${entityLabel}, or if you don't have it, your registered phone number or email?`;
      case 'entity_amount':
        return `I can check the billing details for you! What is your ${entityLabel}, or registered phone number?`;
      case 'entity_customer':
        return `Sure! Could you share the ${entityLabel}, or the customer's phone number or name?`;
      default:
        return `I'd be happy to look that up for you! Could you share your ${entityLabel}, or if you don't have it handy, your registered phone number or email?`;
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

    // CHECK FOR MISSING / FORGOTTEN ID / ALTERNATIVE REQUEST FIRST!
    if (this.isIdentifierUnavailable(userInput)) {
      logger.info(
        `[SlotFilling] User expressed missing/forgotten ID or asked for alternative lookup: "${userInput}"`
      );
      const alternativeClarification = `No problem at all! If you don't have your ${entityLabel} handy, you can give me your registered phone number, email address, or full name, and I'll find your details right away.`;
      return {
        hasActiveIdentifier: false,
        resolvedIdentifier: null,
        isNewIdentifier: false,
        requiresClarification: true,
        clarificationMessage: alternativeClarification,
        pendingRequest: {
          intent: 'alternative_lookup',
          requiredSlots: ['phone, email, or name'],
          collectedSlots: {},
          originalUserRequest: userInput,
          createdAt: Date.now()
        },
        effectiveUserQuery: userInput
      };
    }

    const rawIdInUtterance = this.extractIdentifier(userInput);

    // CASE 1: Direct identifier (ID, phone, email, or name) provided in current utterance
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
    const isSmallTalkOrGeneral =
      // Greetings & small talk
      /\b(good\s*(morning|afternoon|evening|day|night)|hello|hi|hey|how are you|who are you|what(?:'s|\s+is)\s+(?:your|this|the)\s+company|what do you do|tell me|joke|code|python|print)\b/i.test(userInput) ||
      // General business / product questions — should NEVER trigger ID collection
      /\b(plan|plans|program|programs|pm|package|packages|pricing|price|prices|tier|tiers|subscription|offer|offers|service|services|feature|features|product|products|option|options|what do you (offer|provide|have)|tell me about|what('s| is) (your|the)|how (does|do) (it|this|that|you)|can (i|you)|do you (have|offer|support|provide))\b/i.test(userInput);

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

    // CASE 3: Explicit follow-up ("it", "when will it arrive", "what's the amount") with active context ID
    const { isEntityQuery, intent } = this.isEntityInquiry(userInput, hasStructuredDocs);
    const isFollowUpPronoun = /\b(it|that|this|same|my order|the order|package|delivery|amount|status)\b/i.test(userInput);

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

