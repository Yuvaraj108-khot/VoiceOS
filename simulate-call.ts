import dotenv from 'dotenv';
dotenv.config();

import WebSocket from 'ws';
import { textToSpeech } from './src/voice/TextToSpeech';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[TEST CALL SIMULATION] Starting end-to-end call test...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const port = process.env.PORT || 4009;
  const ws = new WebSocket(`ws://localhost:${port}/media-stream`);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => resolve());
    ws.on('error', reject);
  });

  console.log(`[TEST] ✅ Connected to ws://localhost:${port}/media-stream`);

  // 1. Send Twilio connected and start events
  ws.send(JSON.stringify({ event: 'connected', protocol: 'Call', version: '1.0.0' }));
  ws.send(JSON.stringify({
    event: 'start',
    start: {
      streamSid: 'MZ_SIMULATED_STREAM_1',
      callSid: 'CA_SIMULATED_CALL_1',
      customParameters: {}
    }
  }));

  // Wait for greeting to initialize
  await delay(1200);

  // Send greeting_complete mark
  console.log('[TEST] Simulating Twilio mark: greeting_complete');
  ws.send(JSON.stringify({
    event: 'mark',
    streamSid: 'MZ_SIMULATED_STREAM_1',
    mark: { name: 'greeting_complete' }
  }));

  await delay(300);

  // 2. Simulate Caller saying "Hello"
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('[TEST] 🗣️  CALLER SPEAKING: "Hello"');
  console.log('────────────────────────────────────────────────────────────');

  const helloAudio = await textToSpeech.generateMulawAudio('Hello', 'en-US-AriaNeural');
  console.log(`[TEST] Generated ${helloAudio.length} bytes of μ-law audio for "Hello"`);

  // Stream in 160-byte chunks (20ms)
  for (let i = 0; i < helloAudio.length; i += 160) {
    const chunk = helloAudio.subarray(i, Math.min(i + 160, helloAudio.length));
    ws.send(JSON.stringify({
      event: 'media',
      streamSid: 'MZ_SIMULATED_STREAM_1',
      media: { payload: chunk.toString('base64') }
    }));
    await delay(20);
  }

  // Send 40 silence chunks (800ms) to trigger utterance completion
  const silenceChunk = Buffer.alloc(160, 0xFF);
  for (let i = 0; i < 40; i++) {
    ws.send(JSON.stringify({
      event: 'media',
      streamSid: 'MZ_SIMULATED_STREAM_1',
      media: { payload: silenceChunk.toString('base64') }
    }));
    await delay(20);
  }

  // Wait for AI response to be generated & sent
  await delay(3000);

  // Send mark: ai_response_complete to transition back to listening
  ws.send(JSON.stringify({
    event: 'mark',
    streamSid: 'MZ_SIMULATED_STREAM_1',
    mark: { name: 'ai_response_complete' }
  }));

  await delay(300);

  // 3. Simulate Caller saying "What is the status of order ORD1002?"
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('[TEST] 🗣️  CALLER SPEAKING: "What is the status of order ORD1002?"');
  console.log('────────────────────────────────────────────────────────────');

  const ordAudio = await textToSpeech.generateMulawAudio('What is the status of order ORD1002?', 'en-US-AriaNeural');
  console.log(`[TEST] Generated ${ordAudio.length} bytes of μ-law audio for ORD1002 query`);

  for (let i = 0; i < ordAudio.length; i += 160) {
    const chunk = ordAudio.subarray(i, Math.min(i + 160, ordAudio.length));
    ws.send(JSON.stringify({
      event: 'media',
      streamSid: 'MZ_SIMULATED_STREAM_1',
      media: { payload: chunk.toString('base64') }
    }));
    await delay(20);
  }

  for (let i = 0; i < 40; i++) {
    ws.send(JSON.stringify({
      event: 'media',
      streamSid: 'MZ_SIMULATED_STREAM_1',
      media: { payload: silenceChunk.toString('base64') }
    }));
    await delay(20);
  }

  await delay(3500);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[TEST CALL SIMULATION] Completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  ws.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[TEST ERROR]:', err);
  process.exit(1);
});
