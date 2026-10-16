import { describe, it, expect } from 'vitest';
import { slotFillingEngine } from '../SlotFillingEngine';
import { conversationEngine } from '../ConversationEngine';
import { callSessionManager } from '../../telephony/CallSessionManager';
import { memoryManager } from '../MemoryManager';

function createUniqueCallId(): string {
  return 'test-call-' + Math.random().toString(36).substring(2, 10);
}

describe('SlotFillingEngine & Conversational Business Data Agent', () => {
  // 1. "When will my order arrive?" → asks for order ID
  it('1. "When will my order arrive?" → asks for order ID', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const res = await conversationEngine.processUserInput(callId, 'When will my order arrive?');
    expect(res).toMatch(/order id/i);
    expect(res).not.toMatch(/out for delivery|delivered|shipped|arriving on/i);

    const session = await callSessionManager.getSession(callId);
    expect(session?.variables?.pending_request).toBeDefined();
    expect(session?.variables?.pending_request.intent).toBe('delivery_date');
  }, 25000);

  // 2. "What's the status of my order?" → asks for order ID
  it('2. "What\'s the status of my order?" → asks for order ID', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const res = await conversationEngine.processUserInput(callId, "What's the status of my order?");
    expect(res).toMatch(/order id/i);
    expect(res).not.toMatch(/processing|cancelled/i);
  }, 25000);

  // 3. "When will ORD1002 arrive?" → direct lookup
  it('3. "When will ORD1002 arrive?" → direct lookup without clarification', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const res = await conversationEngine.processUserInput(callId, 'When will ORD1002 arrive?');
    expect(res).not.toMatch(/what's your order id|provide your order id/i);
    expect(res).toMatch(/September|delivery|out for delivery|ORD1002|25/i);
  }, 25000);

  // 4. "What's the status of ORD1002?" → direct lookup
  it('4. "What\'s the status of ORD1002?" → direct lookup without clarification', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const res = await conversationEngine.processUserInput(callId, "What's the status of ORD1002?");
    expect(res).not.toMatch(/what's your order id|provide your order id/i);
    expect(res).toMatch(/out for delivery|delivery/i);
  }, 25000);

  // 5. Follow-up: "When will my order arrive?" → asks ID → "ORD1002" → executes original delivery-date request
  it('5. Follow-up: "When will my order arrive?" → asks ID → "ORD1002" → answers delivery date', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const q1 = await conversationEngine.processUserInput(callId, 'When will my order arrive?');
    expect(q1).toMatch(/order id/i);

    const q2 = await conversationEngine.processUserInput(callId, 'ORD1002');
    expect(q2).toMatch(/September|delivery|out for delivery|ORD1002|25/i);
    expect(q2).not.toMatch(/what's your order id/i);
  }, 25000);

  // 6. Follow-up: "What's the status of ORD1002?" → "When will it arrive?" → resolves ORD1002 from context
  it('6. Follow-up: "What\'s the status of ORD1002?" → "When will it arrive?" → resolves context', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const q1 = await conversationEngine.processUserInput(callId, "What's the status of ORD1002?");
    expect(q1).toMatch(/out for delivery/i);

    const q2 = await conversationEngine.processUserInput(callId, 'When will it arrive?');
    expect(q2).toMatch(/September|delivery|25/i);
  }, 25000);

  // 7. Unknown order: "When will ORD9999 arrive?" → no hallucination
  it('7. Unknown order: "When will ORD9999 arrive?" → no hallucination', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const res = await conversationEngine.processUserInput(callId, 'When will ORD9999 arrive?');
    expect(res).toMatch(/not found|could not find|can't find|cannot find|no record|check|verify/i);
    expect(res).not.toMatch(/will arrive on|delivered to|amount is/i);
  }, 25000);

  // 8. Multiple-turn: "Tell me about ORD1002" → "What's the amount?" → correct amount
  it('8. Multiple-turn: "Tell me about ORD1002" → "What\'s the amount?" → correct amount', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const q1 = await conversationEngine.processUserInput(callId, 'Tell me about ORD1002');
    expect(q1).toMatch(/Mechanical Keyboard|MacBook|out for delivery|ORD1002/i);

    const q2 = await conversationEngine.processUserInput(callId, "What's the amount?");
    expect(q2).toMatch(/3,999|3999/i);
  }, 25000);

  // 9. Ambiguous request: "Tell me about my order" → asks for order ID
  it('9. Ambiguous request: "Tell me about my order" → asks for order ID', async () => {
    const callId = createUniqueCallId();
    await callSessionManager.saveSession({
      callId,
      employeeId: '',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      variables: {}
    });

    const res = await conversationEngine.processUserInput(callId, 'Tell me about my order');
    expect(res).toMatch(/order id/i);
  }, 25000);

  // 10. Identifier normalization: "Order ORD 1002" / "It's 1002" → ORD1002
  it('10. Identifier normalization: "Order ORD 1002" / "It\'s 1002" → normalized to ORD1002', async () => {
    expect(slotFillingEngine.extractIdentifier('Order ORD 1002')).toBe('ORD1002');
    expect(slotFillingEngine.extractIdentifier("It's 1002")).toBe('ORD1002');
    expect(slotFillingEngine.extractIdentifier('order number 1008')).toBe('ORD1008');
    expect(slotFillingEngine.extractIdentifier('#1004')).toBe('ORD1004');
  });
});
