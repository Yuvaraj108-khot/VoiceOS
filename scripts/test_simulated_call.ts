import WebSocket from 'ws';

async function simulateCall() {
  console.log('Connecting to ws://localhost:4000/media-stream...');
  const ws = new WebSocket('ws://localhost:4000/media-stream');

  ws.on('open', () => {
    console.log('WebSocket connected to /media-stream!');

    // 1. Send Twilio connected event
    ws.send(JSON.stringify({
      event: 'connected',
      protocol: 'Call',
      version: '1.0.0'
    }));

    // 2. Send Twilio start event
    setTimeout(() => {
      console.log('Sending Twilio start event...');
      ws.send(JSON.stringify({
        event: 'start',
        sequenceNumber: '1',
        start: {
          streamSid: 'MZ_TEST_12345',
          accountSid: 'AC_TEST_ACCOUNT',
          callSid: 'CA_TEST_CALL_999',
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
        streamSid: 'MZ_TEST_12345',
      }));
    }, 200);
  });

  let mediaCount = 0;
  let greetingFinished = false;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data);

      if (msg.event === 'media') {
        mediaCount++;
        if (mediaCount % 20 === 1) {
          console.log(`[Twilio Client] Received audio chunk #${mediaCount} (payload size: ${msg.media?.payload?.length || 0})`);
        }
      } else if (msg.event === 'mark') {
        console.log(`[Twilio Client] Received mark event: ${msg.mark?.name}`);

        if (msg.mark?.name === 'greeting_complete' && !greetingFinished) {
          greetingFinished = true;
          console.log('[Twilio Client] Echoing mark back to server: greeting_complete');
          // Twilio echoes mark events back to server once playback finishes
          ws.send(JSON.stringify({
            event: 'mark',
            sequenceNumber: '2',
            streamSid: 'MZ_TEST_12345',
            mark: {
              name: 'greeting_complete'
            }
          }));

          console.log('[Twilio Client] The call remains connected! Greeting complete. Test SUCCESSFUL!');
          setTimeout(() => {
            console.log('Closing test socket cleanly.');
            ws.close();
            process.exit(0);
          }, 1500);
        }
      }
    } catch (e: any) {
      console.error('Error parsing server message:', e.message);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err.message);
    process.exit(1);
  });

  ws.on('close', (code) => {
    console.log(`WebSocket closed with code ${code}`);
  });
}

simulateCall();
