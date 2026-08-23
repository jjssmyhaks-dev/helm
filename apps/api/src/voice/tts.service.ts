import { Injectable, Logger } from '@nestjs/common';

interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  duration: number;
}

/**
 * Text-to-Speech service using ElevenLabs.
 * Falls back to OpenAI TTS if ElevenLabs is unavailable.
 */
@Injectable()
export class TTSService {
  private readonly logger = new Logger(TTSService.name);
  private provider: 'elevenlabs' | 'openai' | 'none';
  private elevenlabsApiKey: string;
  private voiceId: string;

  constructor() {
    this.elevenlabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel - default voice

    if (this.elevenlabsApiKey) {
      this.provider = 'elevenlabs';
    } else if (process.env.OPENAI_API_KEY) {
      this.provider = 'openai';
    } else {
      this.provider = 'none';
    }

    if (this.provider === 'none') {
      this.logger.warn('No TTS provider configured. Set ELEVENLABS_API_KEY or OPENAI_API_KEY.');
    } else {
      this.logger.log(`TTS provider: ${this.provider}`);
    }
  }

  /**
   * Convert text to speech audio.
   */
  async synthesize(text: string, voiceId?: string): Promise<TTSResult> {
    if (this.provider === 'elevenlabs') {
      return this.synthesizeWithElevenLabs(text, voiceId || this.voiceId);
    } else if (this.provider === 'openai') {
      return this.synthesizeWithOpenAI(text);
    }

    throw new Error('No TTS provider configured.');
  }

  /**
   * Synthesize speech using ElevenLabs.
   */
  private async synthesizeWithElevenLabs(text: string, voiceId: string): Promise<TTSResult> {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenlabsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs error: ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer,
      mimeType: 'audio/mpeg',
      duration: this.estimateDuration(text),
    };
  }

  /**
   * Synthesize speech using OpenAI TTS.
   */
  private async synthesizeWithOpenAI(text: string): Promise<TTSResult> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'nova',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS error: ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer,
      mimeType: 'audio/mpeg',
      duration: this.estimateDuration(text),
    };
  }

  /**
   * List available voices.
   */
  async listVoices(): Promise<Array<{ id: string; name: string; description?: string }>> {
    if (this.provider === 'elevenlabs') {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': this.elevenlabsApiKey },
      });
      const data = await response.json();
      return (data.voices || []).map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        description: v.description,
      }));
    }

    return [
      { id: 'alloy', name: 'Alloy' },
      { id: 'echo', name: 'Echo' },
      { id: 'fable', name: 'Fable' },
      { id: 'onyx', name: 'Onyx' },
      { id: 'nova', name: 'Nova' },
      { id: 'shimmer', name: 'Shimmer' },
    ];
  }

  /**
   * Check if TTS is available.
   */
  isAvailable(): boolean {
    return this.provider !== 'none';
  }

  getProvider(): string {
    return this.provider;
  }

  private estimateDuration(text: string): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length;
    return (words / 150) * 60;
  }
}
