import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

async function testMsEdgeWarm() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  // Call 1
  const t1 = Date.now();
  await new Promise<void>((resolve) => {
    const { audioStream } = tts.toStream('First sentence to speak.');
    audioStream.on('data', () => {});
    audioStream.on('close', () => {
      console.log(`First sentence generated in ${Date.now() - t1}ms`);
      resolve();
    });
  });

  // Call 2 (warm socket!)
  const t2 = Date.now();
  await new Promise<void>((resolve) => {
    const { audioStream } = tts.toStream('Second sentence to speak.');
    audioStream.on('data', () => {});
    audioStream.on('close', () => {
      console.log(`Second sentence generated in ${Date.now() - t2}ms`);
      resolve();
    });
  });

  tts.close();
}

testMsEdgeWarm();
