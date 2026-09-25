import { describe, it, expect, vi } from 'vitest';
import { audioProcessor } from '../../voice/AudioProcessor';
import { textToSpeech } from '../../voice/TextToSpeech';
import { AudioStreamer } from '../AudioStreamer';

describe('VoiceOS Telephony Pipeline & State Flow', () => {
  it('AudioProcessor: should compute RMS energy for silence and speech', () => {
    const silence = Buffer.alloc(160, 0xff); // 0xff in mulaw is zero amplitude
    const silenceRms = audioProcessor.getRms(silence);
    expect(silenceRms).toBe(0);
    expect(audioProcessor.isSpeech(silence)).toBe(false);

    // Simulated speech chunk
    const speech = Buffer.from(Array.from({ length: 160 }, (_, i) => (i % 2 === 0 ? 0x00 : 0x80)));
    const speechRms = audioProcessor.getRms(speech);
    expect(speechRms).toBeGreaterThan(1000);
    expect(audioProcessor.isSpeech(speech)).toBe(true);
  });

  it('AudioProcessor: should transcode mulaw to 16kHz WAV format', async () => {
    const mulaw = Buffer.alloc(8000, 0xff); // 1 second of mulaw audio
    const wav = await audioProcessor.mulawToWav(mulaw);

    expect(wav.length).toBeGreaterThan(16000);
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
  });

  it('AudioStreamer: should not drop call after greeting and transition to listening', () => {
    const mediaMock = vi.fn();
    const markMock = vi.fn();
    const streamer = new AudioStreamer(mediaMock, markMock);

    streamer.start('CA12345');
    expect(streamer.getListening()).toBe(false); // In greeting, not listening

    // Simulate greeting mark completion
    streamer.setListening(true);
    expect(streamer.getListening()).toBe(true); // Now actively listening for caller

    // Send audio chunks
    const speechChunk = Buffer.from(Array.from({ length: 160 }, (_, i) => (i % 2 === 0 ? 0x00 : 0x80))).toString('base64');
    let speechCompleteFired = false;
    streamer.onSpeechComplete = (buf) => {
      speechCompleteFired = true;
      expect(buf.length).toBeGreaterThan(3200);
    };

    // Feed 30 speech chunks (> 400ms speech)
    for (let i = 0; i < 30; i++) {
      streamer.receiveAudio(speechChunk);
    }

    // Feed 45 silence chunks (> 800ms silence to trigger speech complete)
    const silenceChunk = Buffer.alloc(160, 0xff).toString('base64');
    for (let i = 0; i < 45; i++) {
      streamer.receiveAudio(silenceChunk);
    }

    expect(speechCompleteFired).toBe(true);
  });

  it('TextToSpeech: should produce mulaw audio for Twilio streaming', async () => {
    const mulaw = await textToSpeech.generateMulawAudio('Hello, this is a test greeting.');
    expect(mulaw.length).toBeGreaterThan(0);
  }, 15000);
});
