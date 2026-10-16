import { textToSpeech } from '../src/voice/TextToSpeech';

async function main() {
  try {
    const p1 = await textToSpeech.generateMulawAudio('Hello and welcome! Press 1 for English.', 'en-IN-NeerjaExpressiveNeural');
    const p2 = await textToSpeech.generateMulawAudio('हिंदी के लिए दो दबाएं।', 'hi-IN-SwaraNeural');
    console.log(`SUCCESS: p1 = ${p1.length} bytes, p2 = ${p2.length} bytes`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

main();
