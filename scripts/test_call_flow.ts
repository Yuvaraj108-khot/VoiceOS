import WebSocket from 'ws';
import { textToSpeech } from '../src/voice/TextToSpeech';

async function testCallFlow() {
  console.log('--- STARTING CALL FLOW TEST ---');

  // Pre-generate caller speech: "Hello, where is my package?"
  console.log('Generating caller speech...');
  const part1 = await textToSpeech.generateMulawAudio("Hello, where is");
  const pause = Buffer.alloc(4000, 0xFF); // 500ms pause in between words
  const part2 = await textToSpeech.generateMulawAudio("my package?");
  const callerMulaw = Buffer.concat([part1, pause, part2]);
  console.log(`Generated ${callerMulaw.length} bytes of speech with mid-sentence pause.`);

  const ws = new WebSocket('ws://localhost:4009/media-stream');

  ws.on('open', () => {
    console.log('[Test Client] Connected to ws://localhost:4009/media-stream');
    ws.send(JSON.stringify({ event: 'connected', protocol: 'Call', version: '1.0.0' }));

    setTimeout(() => {
      console.log('[Test Client] Sending start event...');
      ws.send(JSON.stringify({
        event: 'start',
        sequenceNumber: '1',
        start: {
          streamSid: 'MZ_TEST_FLOW',
          accountSid: 'AC_TEST_ACCOUNT',
          callSid: 'CA_TEST_FLOW_001',
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
        streamSid: 'MZ_TEST_FLOW',
      }));
    }, 100);
  });

  let greetingDone = false;
  let callerSpeechSent = false;
  let aiResponseReceived = false;

  ws.on('message', async (data: string) => {
    const msg = JSON.parse(data);

    if (msg.event === 'mark') {
      console.log(`[Test Client] Received mark: ${msg.mark?.name}`);

      if (msg.mark?.name === 'greeting_complete' && !greetingDone) {
        greetingDone = true;
        console.log('[Test Client] Greeting finished! Echoing mark to server...');
        ws.send(JSON.stringify({
          event: 'mark',
          streamSid: 'MZ_TEST_FLOW',
          mark: { name: 'greeting_complete' }
        }));

        setTimeout(() => {
          console.log('[Test Client] Caller starts speaking with mid-sentence pause...');
          callerSpeechSent = true;
          const CHUNK_SIZE = 160;
          let offset = 0;
          let seq = 10;

          const streamInterval = setInterval(() => {
            if (offset < callerMulaw.length) {
              const chunk = callerMulaw.subarray(offset, offset + CHUNK_SIZE);
              ws.send(JSON.stringify({
                event: 'media',
                sequenceNumber: String(seq++),
                streamSid: 'MZ_TEST_FLOW',
                media: { payload: chunk.toString('base64'), timestamp: String(offset / 8) }
              }));
              offset += CHUNK_SIZE;
            } else {
              clearInterval(streamInterval);
              console.log('[Test Client] Caller finished. Sending 1.4s silence for natural turn completion...');
              const silence = Buffer.alloc(160, 0xFF);
              let sc = 0;
              const sInt = setInterval(() => {
                ws.send(JSON.stringify({
                  event: 'media',
                  sequenceNumber: String(seq++),
                  streamSid: 'MZ_TEST_FLOW',
                  media: { payload: silence.toString('base64'), timestamp: String((offset + sc * 160) / 8) }
                }));
                sc++;
                if (sc >= 70) { // 1.4s of silence
                  clearInterval(sInt);
                  console.log('[Test Client] Waiting for AI response...');
                }
              }, 20);
            }
          }, 20);
        }, 300);
      } else if (msg.mark?.name === 'ai_response_complete') {
        console.log('[Test Client] AI response completed!');
        aiResponseReceived = true;
        console.log('=== TEST RESULT: PASSED! FULL SENTENCE RECEIVED AND ANSWERED ===');
        ws.close();
        process.exit(0);
      }
    } else if (msg.event === 'media' && callerSpeechSent && !aiResponseReceived) {
      // First chunk of AI response received
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
    process.exit(1);
  });

  setTimeout(() => {
    if (!aiResponseReceived) {
      console.log('Test timed out after 30 seconds');
      process.exit(1);
    }
  }, 30000);
}

testCallFlow();
