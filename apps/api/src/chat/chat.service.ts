import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { GlobalOrchestratorService } from '../orchestrator/global-orchestrator.service.js';
import { ContextService } from '../context/context.service.js';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private orchestrator: GlobalOrchestratorService,
    private contextService: ContextService,
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
}
