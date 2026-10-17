import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export class PromptBuilder {
  private employeeCache = new Map<string, { data: any; expiry: number }>();
  private docsCache = new Map<string, { data: any[]; expiry: number }>();

  /**
   * Constructs the master system prompt for the AI Employee, injecting static RAG knowledge
   * and live structured business data source schemas.
   */
  async buildSystemPrompt(
    employeeId: string,
    context: string,
    variables: Record<string, any> = {},
    verifiedBusinessData?: string,
    enforcedLanguage?: 'en' | 'hi'
  ): Promise<string> {
    const now = Date.now();
    let employee: any = null;

    if (employeeId && this.employeeCache.has(employeeId)) {
      const cached = this.employeeCache.get(employeeId)!;
      if (cached.expiry > now) {
        employee = cached.data;
      }
    }

    if (!employee && employeeId) {
      employee = await prisma.aIEmployee.findUnique({
        where: { id: employeeId },
        include: { organization: true }
      }).catch(() => null);

      if (employee) {
        this.employeeCache.set(employeeId, { data: employee, expiry: now + 300000 }); // 5 min TTL
      }
    }

    if (!employee) {
      employee = (await prisma.aIEmployee.findFirst({
        where: { status: 'ACTIVE' },
        include: { organization: true },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null)) || {
        id: 'default',
        organizationId: 'default',
        name: 'Yuvaraj',
        slug: 'yuvaraj',
        description: null,
        status: 'ACTIVE' as any,
        avatarUrl: null,
        role: 'Customer Support Representative',
        personality: 'Professional, consultative, warm, and highly knowledgeable about our company',
        systemPrompt: `You are an AI voice employee. Keep your answers conversational, concise (1-3 sentences), and suitable for a phone call. Never use markdown formatting or bullet points. Speak warmly and guide the customer toward answering their questions. Always wait for the customer and keep assisting until they say thank you.`,
        firstMessage: "Hi! Thanks for reaching out. How can I assist you today?",
        fallbackMessage: "I'm sorry, could you repeat that?",
        transferNumber: null,
        maxCallDuration: 1800,
        silenceTimeout: 5,
        endCallPhrases: [],
        languages: ['en'],
        currentLanguage: 'en',
        isTestMode: false,
        callsHandled: 0,
        totalCallDuration: 0,
        avgSatisfaction: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        organization: { name: 'VoiceOS' }
      };
    }

    const companyName = (employee as any)?.organization?.name || 'our company';
    let prompt = `You are an AI voice employee named ${employee.name} representing ${companyName}.\n`;
    if (employee.systemPrompt) {
      prompt += `${employee.systemPrompt}\n\n`;
    }

    // Inject variables (e.g., customer name, current date)
    const dateStr = new Date().toLocaleString();
    prompt += `Current Date and Time: ${dateStr}\n`;

    if (variables.customerName) {
      prompt += `You are speaking with: ${variables.customerName}\n`;
    }

    const isHindi = enforcedLanguage === 'hi' || variables.language === 'hi';
    if (isHindi) {
      prompt += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL MANDATORY LANGUAGE INSTRUCTION — HINDI (हिंदी):
The caller has chosen HINDI (हिंदी). 
1. You MUST speak and respond 100% in HINDI.
2. Use conversational Hindi / Hinglish in Devanagari or clean Roman script.
3. NEVER SPEAK ENGLISH. NEVER respond in English.
4. DO NOT say "I will switch to Hindi from now on" in English! If acknowledging, say in Hindi: "जी बिल्कुल! मैं आपकी क्या सहायता कर सकता हूँ?"
5. Examples of correct Hindi responses:
   - "जी बिल्कुल! अपना फोन नंबर बताएं, मैं आपका ऑर्डर तुरंत चेक कर देता हूँ।"
   - "क्षमा करें, इस नंबर से कोई ऑर्डर नहीं मिला। क्या आप अपना ईमेल या दूसरा नंबर बता सकते हैं?"
   - "नमस्ते! VoiceOS में आपका स्वागत है। बताइए मैं आपकी क्या मदद करूँ?"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    } else if (enforcedLanguage === 'en' || variables.language === 'en') {
      prompt += `LANGUAGE PREFERENCE: The caller explicitly selected ENGLISH. Respond in fluent, natural English.\n`;
    }

    // Query active structured spreadsheets for this organization so the LLM understands available business fields
    let hasOrderData = false;
    let primaryEntityLabel = 'reference ID';

    if (employee.organizationId && employee.organizationId !== 'default') {
      try {
        let structuredDocs: any[] | null = null;
        if (this.docsCache.has(employee.organizationId)) {
          const cached = this.docsCache.get(employee.organizationId)!;
          if (cached.expiry > now) {
            structuredDocs = cached.data;
          }
        }

        if (!structuredDocs) {
          structuredDocs = await prisma.knowledgeDocument.findMany({
            where: {
              organizationId: employee.organizationId,
              type: { in: ['XLSX', 'CSV', 'SPREADSHEET'] },
              status: 'READY',
              deletedAt: null
            },
            select: { name: true, metadata: true }
          }).catch(() => []);
          this.docsCache.set(employee.organizationId, { data: structuredDocs, expiry: now + 300000 });
        }

        if (structuredDocs.length > 0) {
          prompt += `\n--- CONNECTED BUSINESS DATA SOURCES (EXACT RECORDS) ---\n`;
          for (const doc of structuredDocs) {
            const meta = doc.metadata as any;
            const cols = meta?.columns ? meta.columns.map((c: any) => c.key || c.name).join(', ') : 'all row fields';
            const primaryKey = meta?.primaryKey || 'reference ID';
            prompt += `• Source "${doc.name}": Available fields: [${cols}]. Primary identifier: ${primaryKey}\n`;

            const docNameLower = (doc.name || '').toLowerCase();
            const colsLower = cols.toLowerCase();
            if (
              docNameLower.includes('order') ||
              docNameLower.includes('delivery') ||
              docNameLower.includes('shipping') ||
              docNameLower.includes('package') ||
              docNameLower.includes('purchase') ||
              colsLower.includes('order_id') ||
              colsLower.includes('expected_delivery')
            ) {
              hasOrderData = true;
            }

            if (meta?.primaryKey) {
              primaryEntityLabel = String(meta.primaryKey).replace(/_/g, ' ');
            }
          }
          prompt += `RULE: For customer-SPECIFIC lookup questions ("where is my order?", "what's my account status?"), only state verified information from the records. NEVER fabricate or guess IDs, statuses, or details. For GENERAL questions (pricing, plans, company info, how things work), answer directly from your knowledge — do NOT ask the caller for an identifier.\n----------------------------------------------------\n`;
        }
      } catch { /* ignore */ }
    }

    // Inject Verified Live Business Data Result (exact lookup result)
    if (verifiedBusinessData) {
      prompt += `\n--- VERIFIED LIVE BUSINESS DATA RESULT ---\n${verifiedBusinessData}\n------------------------------------------\n`;
      prompt += `Use the verified record above to answer the customer's question directly, accurately, and warmly. If the record indicates NOT FOUND, explain gently that no matching record was found under that identifier, and offer helpful alternatives: ask if they would like you to search using their registered phone number, email, or full name, or if they would like information on other company plans and services.\nIMPORTANT: If this NOT FOUND result appears but the user was asking a GENERAL question (about plans, pricing, or services), IGNORE the NOT FOUND context entirely and just answer the general question.\n`;
    }

    // Inject RAG context for static company knowledge
    if (context) {
      prompt += `\n--- STATIC BUSINESS KNOWLEDGE BASE (SOURCE OF TRUTH) ---\n${context}\n--------------------------------------------------------\n`;
      prompt += `Use the static company knowledge above as your reference for policy, product features, and general company information.\n`;
    }

    prompt += `\nCONVERSATIONAL VOICE CALL GUIDELINES:
1. NATURAL, WARM CONVERSATION: Speak like an attentive, helpful human representative. Keep each response concise (1 to 2 sentences per turn) so the caller can easily follow over the phone. Avoid robotic scripts or repetitive filler prefixes.
2. GENERAL QUESTIONS (CRITICAL RULE — READ CAREFULLY):
   - If the caller asks about plans, pricing, packages, services, company info, or anything general — answer it DIRECTLY. Do NOT ask for their email, phone, or ID.
   - Questions like "what are your plans?", "tell me about your services", "how does this work?", "what do you offer?" are GENERAL questions. Answer them from your knowledge base. Never redirect to "please provide your identifier".
   - ONLY ask for an identifier (ID, phone, email, name) when the user is clearly asking about THEIR OWN specific account, order, or record (e.g. "where is my order?", "what's my account status?", "check my delivery").
3. MISSING OR FORGOTTEN IDENTIFIERS (FLEXIBILITY & ALTERNATIVES):
   - If the caller does not remember, does not know, or does not have their ID, order number, or reference code, DO NOT keep asking for it.
   - Reassure them immediately and offer alternative lookup paths: "No problem at all! You can share your registered phone number, email address, or full name, and I will be happy to look it up for you."
   - If the caller still does not have an account or active order, offer other practical options: e.g. helping them check their email or SMS confirmation, discussing company plans and services, or taking down their details.
4. CLEAN SPOKEN OUTPUT: Output only clean spoken words (no markdown symbols like asterisks, hashtags, or bullet points).
5. MULTILINGUAL & HINGLISH SUPPORT: Match the caller's spoken language naturally (English, Hindi, or conversational Hinglish).
6. CONVERSATION FLOW: Remain on the line listening attentively. When the caller indicates they are done and says "Thank you", respond warmly with "You're very welcome! Have a wonderful day!" and conclude.`;

    return prompt;
  }
}

export const promptBuilder = new PromptBuilder();
