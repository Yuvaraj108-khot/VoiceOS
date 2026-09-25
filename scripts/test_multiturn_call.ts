import WebSocket from 'ws';
import { textToSpeech } from '../src/voice/TextToSpeech';

async function testMultiTurnCall() {
  console.log('--- STARTING MULTI-TURN CALL TEST ---');
  // Pre-generate caller speech μ-law audio: "Hello, what does your company do?"
  console.log('Generating caller speech audio via Edge-TTS & AudioProcessor...');
  const callerMulaw = await textToSpeech.generateMulawAudio("Hello, what does your company do?");
  console.log(`Generated ${callerMulaw.length} bytes of caller speech audio.`);

  console.log('Connecting to ws://localhost:4000/media-stream...');
  const ws = new WebSocket('ws://localhost:4000/media-stream');

  ws.on('open', () => {
    console.log('[Twilio Client] WebSocket opened.');

    // 1. Send Twilio connected event
    ws.send(JSON.stringify({
      event: 'connected',
      protocol: 'Call',
      version: '1.0.0'
    }));

    // 2. Send Twilio start event
    setTimeout(() => {
      console.log('[Twilio Client] Sending Twilio start event...');
      ws.send(JSON.stringify({
        event: 'start',
        sequenceNumber: '1',
        start: {
          streamSid: 'MZ_MULTITURN_TEST',
          accountSid: 'AC_TEST_ACCOUNT',
          callSid: 'CA_MULTITURN_CALL_001',
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
        streamSid: 'MZ_MULTITURN_TEST',
      }));
    }, 200);
  });

  let greetingFinished = false;
  let callerSpeechSent = false;
  let aiResponseReceived = false;

  ws.on('message', async (data: string) => {
    try {
      const msg = JSON.parse(data);

      if (msg.event === 'mark') {
        console.log(`[Twilio Client] Received mark event: ${msg.mark?.name}`);

        if (msg.mark?.name === 'greeting_complete' && !greetingFinished) {
          greetingFinished = true;
          console.log('[Twilio Client] Greeting completed. Echoing mark to server...');
          ws.send(JSON.stringify({
            event: 'mark',
            sequenceNumber: '2',
            streamSid: 'MZ_MULTITURN_TEST',
            mark: { name: 'greeting_complete' }
          }));

          // Call is now in LISTENING state. Wait 500ms then start streaming caller speech!
          setTimeout(async () => {
            console.log('[Twilio Client] Caller starts speaking: "Hello, what does your company do?"');
            callerSpeechSent = true;

            const CHUNK_SIZE = 160; // 20ms chunks of 8kHz mulaw
            let offset = 0;
            let seq = 10;

            const streamInterval = setInterval(() => {
              if (offset < callerMulaw.length) {
                const chunk = callerMulaw.subarray(offset, offset + CHUNK_SIZE);
                ws.send(JSON.stringify({
                  event: 'media',
                  sequenceNumber: String(seq++),
                  streamSid: 'MZ_MULTITURN_TEST',
                  media: {
                    payload: chunk.toString('base64'),
                    timestamp: String(offset / 8),
                  }
                }));
                offset += CHUNK_SIZE;
              } else {
                clearInterval(streamInterval);
                console.log('[Twilio Client] Finished speaking. Sending silence chunks for VAD...');

                // Send 1 second of silence (0xFF in mulaw) to trigger VAD speech end
                const silenceChunk = Buffer.alloc(160, 0xFF);
                let silenceCount = 0;
                const silenceInterval = setInterval(() => {
                  ws.send(JSON.stringify({
                    event: 'media',
                    sequenceNumber: String(seq++),
                    streamSid: 'MZ_MULTITURN_TEST',
                    media: {
                      payload: silenceChunk.toString('base64'),
                      timestamp: String((offset + silenceCount * 160) / 8),
                    }
                  }));
                  silenceCount++;
                  if (silenceCount >= 55) { // ~1.1 seconds of silence
                    clearInterval(silenceInterval);
                    console.log('[Twilio Client] Silence sent. Waiting for AI response...');
                  }
                }, 20);
              }
            }, 20);
          }, 500);
        } else if (msg.mark?.name === 'ai_response_complete') {
          console.log('[Twilio Client] Received AI response complete mark!');
          aiResponseReceived = true;
          console.log('=== MULTI-TURN TEST PASSED WITH 100% SUCCESS ===');
          setTimeout(() => {
            ws.close();
            process.exit(0);
          }, 1000);
        }
      } else if (msg.event === 'media' && callerSpeechSent) {
        // AI is responding
        // console.log(`[Twilio Client] Received AI response audio chunk (${msg.media?.payload?.length} bytes)`);
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

testMultiTurnCall();
