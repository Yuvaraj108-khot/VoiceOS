import { conversationEngine } from '../src/conversation/ConversationEngine';
import { callSessionManager } from '../src/telephony/CallSessionManager';

async function testHindiEnforcement() {
  const callId = 'test-hindi-' + Date.now();
  console.log('Testing Hindi Language Enforcement on Call:', callId);

  // 1. Simulate Hindi language selection
  await callSessionManager.saveSession({
    callId,
    employeeId: '7a007f62-0dad-4368-9f1b-d6ff7181429d',
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    variables: { language: 'hi' }
  });

  const sentences: string[] = [];
  const res = await conversationEngine.processUserInputStreaming(
    callId,
    "मुझे अपना आडर जानना है मेरा फोन नंबर 9876540105 है",
    '7a007f62-0dad-4368-9f1b-d6ff7181429d',
    async (s, isFinal) => {
      if (s) {
        console.log('  [STREAMED SENTENCE]:', s);
        sentences.push(s);
      }
    },
    'hi'
  );

  console.log('\n--- FULL AI RESPONSE ---');
  console.log(res);

  // Check that response contains Hindi / Devanagari
  const hasDevanagari = /[\u0900-\u097F]/.test(res);
  const containsEnglishApology = /sorry|english|misunderstanding/i.test(res);

  console.log('\nHas Devanagari Hindi:', hasDevanagari);
  console.log('Contains English Apology Leak:', containsEnglishApology);

  if (hasDevanagari && !containsEnglishApology) {
    console.log('✅ TEST PASSED: AI responded in pure Hindi without English leaks!');
  } else {
    console.error('❌ TEST FAILED: Response was not proper Hindi or had English leak');
  }

  process.exit(0);
}

testHindiEnforcement().catch(err => {
  console.error(err);
  process.exit(1);
});
