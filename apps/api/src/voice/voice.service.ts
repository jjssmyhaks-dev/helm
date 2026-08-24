import { Injectable, Logger } from '@nestjs/common';

/**
 * Voice I/O Service
 * - STT: Deepgram for speech-to-text
 * - TTS: ElevenLabs for text-to-speech
 *
 * Both use streaming for low latency.
 */
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private deepgramKey: string;
  private elevenLabsKey: string;

  constructor() {
    this.deepgramKey = process.env.DEEPGRAM_API_KEY || '';
    this.elevenLabsKey = process.env.ELEVENLABS_API_KEY || '';
    this.logger.log(`Voice: Deepgram=${this.deepgramKey ? 'configured' : 'not configured'}, ElevenLabs=${this.elevenLabsKey ? 'configured' : 'not configured'}`);
  }

  /**
   * Transcribe audio buffer to text using Deepgram.
   * Accepts raw audio (wav, webm, mp3) and returns transcript.
   */
  async transcribe(audioBuffer: Buffer, mimeType = 'audio/webm'): Promise<{ text: string; confidence: number }> {
    if (!this.deepgramKey) {
      throw new Error('Deepgram API key not configured. Set DEEPGRAM_API_KEY.');
    }

    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/ogg': 'ogg',
      'audio/m4a': 'm4a',
    };
    const format = extMap[mimeType] || 'webm';

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&detect_language=true&punctuate=true`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.deepgramKey}`,
          'Content-Type': `audio/${format}`,
        },
        body: new Uint8Array(audioBuffer),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram error: ${error}`);
    }

    const data = await response.json();
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    return {
      text: alternative?.transcript || '',
      confidence: alternative?.confidence || 0,
    };
  }

  /**
   * Transcribe streaming audio (for real-time voice input).
   * Returns an async generator of transcript chunks.
   */
  async *transcribeStream(
    audioStream: ReadableStream<Uint8Array>,
    mimeType = 'audio/webm',
  ): AsyncGenerator<{ text: string; isFinal: boolean }> {
    if (!this.deepgramKey) {
      throw new Error('Deepgram API key not configured.');
    }

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&punctuate=true&interim_results=true&endpointing=300&utterance_end_ms=1000`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.deepgramKey}`,
          'Content-Type': `audio/${mimeType.replace('audio/', '')}`,
        },
        body: audioStream,
      },
    );

    if (!response.ok || !response.body) {
      throw new Error('Deepgram streaming failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          const channel = data.channel;
          if (channel?.alternatives?.[0]) {
            yield {
              text: channel.alternatives[0].transcript || '',
              isFinal: data.is_final || false,
            };
          }
        } catch {}
      }
    }
  }

  /**
   * Convert text to speech using ElevenLabs.
   * Returns audio buffer (MP3).
   */
  async synthesize(
    text: string,
    voiceId = '21m00Tcm4TlvDq8ikWAM', // Rachel - default ElevenLabs voice
  ): Promise<{ audio: Buffer; contentType: string }> {
    if (!this.elevenLabsKey) {
      throw new Error('ElevenLabs API key not configured. Set ELEVENLABS_API_KEY.');
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs error: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      audio: Buffer.from(arrayBuffer),
      contentType: 'audio/mpeg',
    };
  }

  /**
   * List available ElevenLabs voices.
   */
  async listVoices(): Promise<{ id: string; name: string; category: string }[]> {
    if (!this.elevenLabsKey) return [];

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': this.elevenLabsKey },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category || 'unknown',
    }));
  }

  /**
   * Check voice provider health.
   */
  async healthCheck(): Promise<{ deepgram: boolean; elevenLabs: boolean }> {
    return {
      deepgram: !!this.deepgramKey,
      elevenLabs: !!this.elevenLabsKey,
    };
  }
}
