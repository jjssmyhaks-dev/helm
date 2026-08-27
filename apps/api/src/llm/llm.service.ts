import { Injectable, Logger } from '@nestjs/common';

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface LLMResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}

interface LLMStreamChunk {
  content: string;
  done: boolean;
}

/**
 * Unified LLM service supporting Groq (primary) with streaming.
 * Falls back to Anthropic if Groq is unavailable.
 */
@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private provider: 'groq' | 'anthropic';
  private groqApiKey: string;
  private anthropicApiKey: string;

  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
    this.provider = this.groqApiKey ? 'groq' : 'anthropic';

    this.logger.log(`LLM provider: ${this.provider}`);
  }

  /**
   * Non-streaming completion.
   */
  async complete(
    messages: LLMMessage[],
    options: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    if (this.provider === 'groq') {
      return this.completeGroq(messages, options);
    }
    return this.completeAnthropic(messages, options);
  }

  /**
   * Streaming completion — yields chunks as they arrive.
   */
  async *stream(
    messages: LLMMessage[],
    options: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): AsyncGenerator<LLMStreamChunk> {
    if (this.provider === 'groq') {
      yield* this.streamGroq(messages, options);
    } else {
      yield* this.streamAnthropic(messages, options);
    }
  }

  // ---------------------------------------------------------------------------
  // Groq Implementation
  // ---------------------------------------------------------------------------

  private async completeGroq(
    messages: LLMMessage[],
    options: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || process.env.LLM_MODEL || 'openai/gpt-oss-20b',
        messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
    };
  }

  async *streamGroq(
    messages: LLMMessage[],
    options: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): AsyncGenerator<LLMStreamChunk> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || process.env.LLM_MODEL || 'openai/gpt-oss-20b',
        messages,
        max_tokens: options.maxTokens || 2048,
        temperature: options.temperature ?? 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content, done: false };
            }
          } catch {}
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Anthropic Implementation
  // ---------------------------------------------------------------------------

  private async completeAnthropic(
    messages: LLMMessage[],
    options: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<LLMResponse> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.anthropicApiKey });

    const response = await client.messages.create({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 2048,
      messages: messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      system: messages.find((m) => m.role === 'system')?.content,
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
      },
    };
  }

  async *streamAnthropic(
    messages: LLMMessage[],
    options: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): AsyncGenerator<LLMStreamChunk> {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: this.anthropicApiKey });

    const stream = client.messages.stream({
      model: options.model || 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens || 2048,
      messages: messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      system: messages.find((m) => m.role === 'system')?.content,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { content: event.delta.text, done: false };
      }
    }

    yield { content: '', done: true };
  }

  getProvider(): string {
    return this.provider;
  }
}
