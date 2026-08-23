import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { GlobalOrchestratorService } from '../orchestrator/global-orchestrator.service.js';
import { ContextService } from '../context/context.service.js';
import { LLMService } from '../llm/llm.service.js';
import { Observable, Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private orchestrator: GlobalOrchestratorService,
    private contextService: ContextService,
    private llm: LLMService,
  ) {}

  /**
   * Process a founder's text message through the Global Orchestrator.
   */
  async processMessage(founderId: string, content: string, sessionId?: string) {
    // Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, founderId },
      });
      if (!session) {
        session = await this.prisma.chatSession.create({
          data: { founderId, title: content.slice(0, 80) },
        });
      }
    } else {
      session = await this.prisma.chatSession.create({
        data: { founderId, title: content.slice(0, 80) },
      });
    }

    // Save founder message
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'FOUNDER',
        content,
      },
    });

    // Route through Global Orchestrator
    const result = await this.orchestrator.processMessage(founderId, content);

    // Save agent response
    const responseMessage = await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'AGENT',
        content: result.response,
        metadata: {
          layers: result.layers,
          taskCount: result.tasks.length,
        } as any,
      },
    });

    return {
      message: responseMessage,
      sessionId: session.id,
      spawnedTasks: result.tasks,
    };
  }

  /**
   * Process voice input (STT text → same as text message).
   * STT is handled at the API edge; by the time it reaches here it's text.
   */
  async processVoice(founderId: string, transcript: string, sessionId?: string) {
    return this.processMessage(founderId, transcript, sessionId);
  }

  /**
   * Get chat history for a session.
   */
  async getHistory(founderId: string, sessionId: string, limit = 50) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, founderId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: limit,
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  /**
   * List all sessions for a founder.
   */
  async listSessions(founderId: string) {
    return this.prisma.chatSession.findMany({
      where: { founderId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Stream a response token-by-token via SSE.
   * Returns an Observable<MessageEvent> for NestJS SSE endpoint.
   */
  streamMessage(founderId: string, content: string, sessionId?: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Run async work outside the Observable constructor
    this._streamMessageAsync(subject, founderId, content, sessionId).catch((err) => {
      subject.next({ data: { error: err.message } } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }

  private async _streamMessageAsync(
    subject: Subject<MessageEvent>,
    founderId: string,
    content: string,
    sessionId?: string,
  ) {
    // Get or create session
    let session;
    if (sessionId) {
      session = await this.prisma.chatSession.findFirst({
        where: { id: sessionId, founderId },
      });
    }
    if (!session) {
      session = await this.prisma.chatSession.create({
        data: { founderId, title: content.slice(0, 80) },
      });
    }

    // Send session ID first
    subject.next({
      data: { type: 'session', sessionId: session.id },
    } as MessageEvent);

    // Save founder message
    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'FOUNDER', content },
    });

    // Get context for the LLM
    const context = await this.contextService.retrieveRelevant(founderId, content);

    // Build the prompt
    const systemPrompt = `You are Helm, an AI operating system for solo founders. You have 21 specialist agents across 4 layers: Research, Marketing, Operations, and Finance. Respond concisely and helpfully. If the founder's message requires action across multiple layers, mention which teams are working on it.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: context.length > 0
        ? `Context from memory:\n${context.join('\n')}\n\nFounder: ${content}`
        : content },
    ];

    // Stream the response
    let fullResponse = '';
    for await (const chunk of this.llm.stream(messages)) {
      if (chunk.done) {
        subject.next({ data: { type: 'done' } } as MessageEvent);
        break;
      }
      fullResponse += chunk.content;
      subject.next({
        data: { type: 'chunk', content: chunk.content },
      } as MessageEvent);
    }

    // Save the complete response
    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'AGENT',
        content: fullResponse,
        metadata: { streamed: true } as any,
      },
    });

    subject.complete();
  }
}
