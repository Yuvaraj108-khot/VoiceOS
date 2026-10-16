import WebSocket from 'ws';

async function testDtmf(digit: string) {
  return new Promise<void>((resolve, reject) => {
    console.log(`\n--- TESTING DTMF KEYPAD PRESS: '${digit}' ---`);
    const ws = new WebSocket('ws://localhost:4009/media-stream');

    ws.on('open', () => {
      ws.send(JSON.stringify({ event: 'connected', protocol: 'Call', version: '1.0.0' }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          event: 'start',
          sequenceNumber: '1',
          start: {
            streamSid: `MZ_DTMF_${digit}`,
            accountSid: 'AC_TEST',
            callSid: `CA_DTMF_${digit}`,
            tracks: ['inbound'],
            customParameters: {
              employeeId: '7a007f62-0dad-4368-9f1b-d6ff7181429d',
            },
            mediaFormat: { encoding: 'audio/x-mulaw', sampleRate: 8000, channels: 1 }
          },
          streamSid: `MZ_DTMF_${digit}`,
        }));
      }, 50);
    });

    let dtmfSent = false;
    let audioReceived = false;

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);

      if (!dtmfSent) {
        dtmfSent = true;
        // Caller presses digit 1 or 2 during greeting
        setTimeout(() => {
          console.log(`[Test] Sending Twilio DTMF event: digit '${digit}'`);
          ws.send(JSON.stringify({
            event: 'dtmf',
            streamSid: `MZ_DTMF_${digit}`,
            dtmf: { digit }
          }));
        }, 300);
      }

      if (msg.event === 'media' && dtmfSent && !audioReceived) {
        audioReceived = true;
        console.log(`[Test] Received audio response from AI after pressing '${digit}'!`);
      }

      if (msg.event === 'mark' && msg.mark?.name === 'ai_response_complete') {
        console.log(`[Test] Response completed for digit '${digit}'. SUCCESS!`);
        ws.close();
        resolve();
      }
    });

    ws.on('error', reject);

    setTimeout(() => {
      if (!audioReceived) {
        ws.close();
        reject(new Error(`Timeout waiting for response for digit ${digit}`));
      } else {
        ws.close();
        resolve();
      }
    }, 10000);
  });
}

async function run() {
  try {
    await testDtmf('1');
    await testDtmf('2');
    console.log('\n=== ALL DTMF TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err: any) {
    console.error('DTMF test failed:', err.message);
    process.exit(1);
  }
}

run();
