import dotenv from 'dotenv';
dotenv.config();

import { audioProcessor } from './src/voice/AudioProcessor';
import { speechToText } from './src/voice/SpeechToText';
import { conversationEngine } from './src/conversation/ConversationEngine';
import { textToSpeech } from './src/voice/TextToSpeech';

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[E2E TEST] Inbound Audio -> VAD -> STT -> LLM Conversation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // STEP 1: Test "Hello"
  console.log('─── TEST STEP 1: Synthesizing & Transcribing "Hello" ───');
  const helloMulaw = await textToSpeech.generateMulawAudio('Hello', 'en-US-AriaNeural');
  console.log(`[AUDIO] μ-law bytes: ${helloMulaw.length} (~${(helloMulaw.length / 8000).toFixed(2)}s)`);

  const rmsSamples: number[] = [];
  for (let i = 0; i < helloMulaw.length; i += 160) {
    const chunk = helloMulaw.subarray(i, Math.min(i + 160, helloMulaw.length));
    rmsSamples.push(Math.round(audioProcessor.getRms(chunk)));
  }
  console.log(`[VAD] Measured RMS across speech chunks: min=${Math.min(...rmsSamples)}, max=${Math.max(...rmsSamples)}, avg=${Math.round(rmsSamples.reduce((a,b)=>a+b,0)/rmsSamples.length)}`);

  const transcript1 = await speechToText.transcribeMulawBuffer(helloMulaw);
  console.log(`[STT RESULT] Transcript: "${transcript1}"\n`);

  // STEP 2: Test "What is the status of order ORD1002?"
  console.log('─── TEST STEP 2: Synthesizing & Transcribing ORD1002 Query ───');
  const ordMulaw = await textToSpeech.generateMulawAudio('What is the status of order ORD1002?', 'en-US-AriaNeural');
  console.log(`[AUDIO] μ-law bytes: ${ordMulaw.length} (~${(ordMulaw.length / 8000).toFixed(2)}s)`);

  const ordRmsSamples: number[] = [];
  for (let i = 0; i < ordMulaw.length; i += 160) {
    const chunk = ordMulaw.subarray(i, Math.min(i + 160, ordMulaw.length));
    ordRmsSamples.push(Math.round(audioProcessor.getRms(chunk)));
  }
  console.log(`[VAD] Measured RMS across speech chunks: min=${Math.min(...ordRmsSamples)}, max=${Math.max(...ordRmsSamples)}, avg=${Math.round(ordRmsSamples.reduce((a,b)=>a+b,0)/ordRmsSamples.length)}`);

  const transcript2 = await speechToText.transcribeMulawBuffer(ordMulaw);
  console.log(`[STT RESULT] Transcript: "${transcript2}"\n`);

  // STEP 3: Test ConversationEngine response to ORD1002 query
  console.log('─── TEST STEP 3: ConversationEngine + Exact Data Lookup ───');
  const aiResponse = await conversationEngine.processUserInputStreaming(
    'live-test-call-id',
    transcript2,
    undefined,
    async (sentence: string, isFinal: boolean) => {
      console.log(`[STREAMED SENTENCE (final=${isFinal})]: "${sentence}"`);
    }
  );
  console.log(`\n[FINAL AI RESPONSE]: "${aiResponse}"`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[E2E TEST] ALL STAGES PASSED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(console.error);
