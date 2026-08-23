import { Injectable, Logger } from '@nestjs/common';

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

/**
 * Speech-to-Text service using Deepgram's Nova-2 model.
 * Falls back to OpenAI Whisper if Deepgram is unavailable.
 */
@Injectable()
export class STTService {
  private readonly logger = new Logger(STTService.name);
  private deepgramApiKey: string;
  private provider: 'deepgram' | 'openai' | 'none';

  constructor() {
    this.deepgramApiKey = process.env.DEEPGRAM_API_KEY || '';
    this.provider = this.deepgramApiKey ? 'deepgram' : (process.env.OPENAI_API_KEY ? 'openai' : 'none');

    if (this.provider === 'none') {
      this.logger.warn('No STT provider configured. Set DEEPGRAM_API_KEY or OPENAI_API_KEY.');
    } else {
      this.logger.log(`STT provider: ${this.provider}`);
    }
  }

  /**
   * Transcribe an audio buffer to text.
   */
  async transcribe(audioBuffer: Buffer, mimeType: string = 'audio/webm'): Promise<TranscriptionResult> {
    if (this.provider === 'deepgram') {
      return this.transcribeWithDeepgram(audioBuffer, mimeType);
    } else if (this.provider === 'openai') {
      return this.transcribeWithOpenAI(audioBuffer, mimeType);
    }

    throw new Error('No STT provider configured. Set DEEPGRAM_API_KEY or OPENAI_API_KEY.');
  }

  /**
   * Transcribe audio using Deepgram Nova-2.
   */
  private async transcribeWithDeepgram(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const url = new URL('https://api.deepgram.com/v1/listen');
    url.searchParams.set('model', 'nova-2');
    url.searchParams.set('language', 'en');
    url.searchParams.set('smart_format', 'true');
    url.searchParams.set('diarize', 'true');
    url.searchParams.set('punctuate', 'true');
    url.searchParams.set('paragraphs', 'true');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.deepgramApiKey}`,
        'Content-Type': mimeType,
      },
      body: new Uint8Array(audioBuffer),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deepgram error: ${error}`);
    }

    const data = await response.json();
    const result = data.results?.channels?.[0]?.alternatives?.[0];

    if (!result) {
      throw new Error('No transcription result from Deepgram');
    }

    return {
      text: result.transcript || '',
      confidence: result.confidence || 0,
      language: data.results?.channels?.[0]?.detected_language || 'en',
      duration: data.metadata?.duration || 0,
      words: (result.words || []).map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      })),
    };
  }

  /**
   * Transcribe audio using OpenAI Whisper.
   */
  private async transcribeWithOpenAI(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
    const formData = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp3') ? 'mp3' : 'wav';
    formData.append('file', new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `audio.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Whisper error: ${error}`);
    }

    const data = await response.json();

    return {
      text: data.text || '',
      confidence: 0.9,
      language: data.language || 'en',
      duration: data.duration || 0,
      words: (data.words || []).map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.probability || 0,
      })),
    };
  }

  /**
   * Check if STT is available.
   */
  isAvailable(): boolean {
    return this.provider !== 'none';
  }

  getProvider(): string {
    return this.provider;
  }
}
