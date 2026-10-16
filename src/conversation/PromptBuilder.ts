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
    verifiedBusinessData?: string
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
          prompt += `RULE: For customer-specific questions, only state verified information from the records. NEVER fabricate or guess IDs, statuses, or details.\n----------------------------------------------------\n`;
        }
      } catch { /* ignore */ }
    }

    // Inject Verified Live Business Data Result (exact lookup result)
    if (verifiedBusinessData) {
      prompt += `\n--- VERIFIED LIVE BUSINESS DATA RESULT ---\n${verifiedBusinessData}\n------------------------------------------\n`;
      prompt += `Use this exact verified record to answer the customer's question directly and concisely. If the record indicates NOT FOUND, clearly explain that no matching record exists in the system and politely ask the caller to confirm their ID. Do NOT guess or make up data.\n`;
    }

    // Inject RAG context for static company knowledge
    if (context) {
      prompt += `\n--- STATIC BUSINESS KNOWLEDGE BASE (SOURCE OF TRUTH) ---\n${context}\n--------------------------------------------------------\n`;
      prompt += `Use the static company knowledge above as your reference for policy, product features, and general company information.\n`;
    }

    const refusalRedirection = hasOrderData
      ? `"I can only assist with inquiries regarding ${companyName} services and customer orders. Could I help you with an order or account inquiry?"`
      : `"I can only assist with inquiries regarding ${companyName} and our company services. How can I assist you with our services today?"`;

    prompt += `\nCRITICAL VOICE CALL RULES:
1. Speak naturally, warmly, and concisely (1 to 2 short sentences per turn, maximum 15-20 words total). Always begin your response immediately with a brief 1-2 word natural confirmation followed by a comma (such as 'Certainly,', 'Sure,', 'Yes,', 'Got it,', 'Understood,') so speech synthesis can stream to the caller instantaneously. Then provide your direct answer immediately.
2. Natural greetings & small talk: Warmly reciprocate greetings ("Good morning!", "I'm doing well, thank you!"), and state your company name (${companyName}) and role when asked.
3. STRICT BUSINESS & DATASET BOUNDARY (NOT A GENERAL CHATBOT): You are strictly a company voice employee for ${companyName}, NOT a general AI chatbot. Strictly stick to this company's services, knowledge base, and uploaded business records.
- If the caller asks for programming code, Python scripts, general world knowledge, trivia, or anything outside this company, politely decline and redirect:
  ${refusalRedirection}
- DYNAMIC DOMAIN RULE: Never mention "orders" or "deliveries" unless this company specifically deals with orders or has an uploaded order dataset. Dynamically adapt your responses to match ${companyName}'s actual business domain, services, and records.
4. DO NOT repeat filler phrases: NEVER say "Can I help you with anything else?", "Is there anything else I can help you with today?", or "How else can I assist?" after your answers. Just give the direct answer and wait quietly for the caller to speak.
5. NEVER say "You're welcome", "Have a great day", or "Goodbye" when looking up information, receiving an ID, answering questions, or greeting the caller.
6. Output only clean, direct text immediately ready to be spoken over the phone (no markdown formatting like *, #, _, or bullet points).
7. CONVERSATION PERSISTENCE & CLOSING: Always remain on the line listening. ONLY when the caller explicitly says "Thank you" or "Thanks" to wrap up, respond warmly with: "You're very welcome! Have a wonderful day!" and conclude.
8. MULTILINGUAL & HINGLISH SUPPORT: You fully understand English, Hindi, and mixed Hinglish (English + Hindi mix). Match the caller's language naturally: if the caller speaks in Hinglish or Hindi, reply warmly in natural conversational Hinglish using the Latin/Roman script (e.g. "Haan bilkul, main check karta hoon.") so text-to-speech can speak it clearly.`;

    return prompt;
  }
}

export const promptBuilder = new PromptBuilder();
