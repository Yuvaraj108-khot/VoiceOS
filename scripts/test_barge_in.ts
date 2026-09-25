import WebSocket from 'ws';
import { textToSpeech } from '../src/voice/TextToSpeech';

async function testBargeIn() {
  console.log('--- STARTING BARGE-IN / INTERRUPTION TEST ---');
  
  // Pre-generate caller interruption audio: "Wait, how much does it cost?"
  console.log('Pre-generating caller interruption speech audio...');
  const callerMulaw = await textToSpeech.generateMulawAudio("Wait, how much does it cost?");
  console.log(`Generated ${callerMulaw.length} bytes of interruption audio.`);

  console.log('Connecting to ws://localhost:4000/media-stream...');
  const ws = new WebSocket('ws://localhost:4000/media-stream');

  let streamSid = 'MZ_BARGEIN_TEST';
  let callSid = 'CA_BARGEIN_CALL_001';
  let greetingChunksReceived = 0;
  let bargeInSent = false;
  let clearEventReceived = false;
  let aiAnswerReceived = false;

  ws.on('open', () => {
    console.log('[Twilio Client] WebSocket opened.');

    // 1. Send connected event
    ws.send(JSON.stringify({
      event: 'connected',
      protocol: 'Call',
      version: '1.0.0'
    }));

    // 2. Send start event
    setTimeout(() => {
      console.log('[Twilio Client] Sending Twilio start event...');
      ws.send(JSON.stringify({
        event: 'start',
        sequenceNumber: '1',
        start: {
          streamSid,
          accountSid: 'AC_TEST_ACCOUNT',
          callSid,
          tracks: ['inbound'],
          customParameters: {
            employeeId: '7a007f62-0dad-4368-9f1b-d6ff7181429d',
            direction: 'inbound',
          },
          mediaFormat: {
            encoding: 'audio/x-mulaw',
            sampleRate: 8000,
            channels: 1,
          }
        },
        streamSid,
      }));
    }, 200);
  });

  ws.on('message', async (data: string) => {
    try {
      const msg = JSON.parse(data);

      // AI starts sending greeting media chunks
      if (msg.event === 'media' && !bargeInSent) {
        greetingChunksReceived++;

        // After 10 chunks (~200ms of greeting), caller interrupts!
        if (greetingChunksReceived === 10) {
          bargeInSent = true;
          console.log('[Twilio Client] AI is speaking greeting. Caller INTERRUPTS: "Wait, how much does it cost?"');

          // Send speech audio chunks to trigger barge-in VAD
          const CHUNK_SIZE = 160;
          let offset = 0;
          let seq = 20;

          const streamInterval = setInterval(() => {
            if (offset < callerMulaw.length) {
              const chunk = callerMulaw.subarray(offset, offset + CHUNK_SIZE);
              ws.send(JSON.stringify({
                event: 'media',
                sequenceNumber: String(seq++),
                streamSid,
                media: {
                  payload: chunk.toString('base64'),
                  timestamp: String(offset / 8),
                }
              }));
              offset += CHUNK_SIZE;
            } else {
              clearInterval(streamInterval);
              console.log('[Twilio Client] Interruption speech finished. Sending silence for VAD...');

              // Send silence chunks (0xFF) to trigger end-of-speech
              const silenceChunk = Buffer.alloc(160, 0xFF);
              let silenceCount = 0;
              const silenceInterval = setInterval(() => {
                ws.send(JSON.stringify({
                  event: 'media',
                  sequenceNumber: String(seq++),
                  streamSid,
                  media: {
                    payload: silenceChunk.toString('base64'),
                    timestamp: String((offset + silenceCount * 160) / 8),
                  }
                }));
                silenceCount++;
                if (silenceCount >= 25) { // ~500ms silence
                  clearInterval(silenceInterval);
                  console.log('[Twilio Client] Silence sent. Awaiting AI response to interruption...');
                }
              }, 20);
            }
          }, 20);
        }
      } else if (msg.event === 'clear') {
        console.log(`[Twilio Client] >>> RECEIVED TWILIO CLEAR EVENT (streamSid: ${msg.streamSid})! Audio buffer successfully flushed! <<<`);
        clearEventReceived = true;
      } else if (msg.event === 'mark') {
        console.log(`[Twilio Client] Received mark event: ${msg.mark?.name}`);
        if (msg.mark?.name === 'ai_response_complete' && clearEventReceived) {
          aiAnswerReceived = true;
          console.log('=== BARGE-IN / INTERRUPTION TEST PASSED WITH 100% SUCCESS ===');
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 1000);
        }
      }
    } catch (e: any) {
      console.error('Error handling message:', e.message);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    process.exit(1);
  });
}

testBargeIn();
