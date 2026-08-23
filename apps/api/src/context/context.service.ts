import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Save a context note with an optional embedding for semantic search.
   */
  async save(founderId: string, key: string, value: string, tags: string[] = []) {
    return this.prisma.contextNote.upsert({
      where: { founderId_key: { founderId, key } },
      update: { value, tags, updatedAt: new Date() },
      create: { founderId, key, value, tags },
    });
  }

  /**
   * Retrieve relevant context notes for a given query.
   * Uses keyword matching for v1; upgrade to pgvector semantic search later.
   */
  async retrieveRelevant(founderId: string, query: string, limit = 10): Promise<string[]> {
    // Simple keyword-based retrieval for v1
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    if (words.length === 0) return [];

    const notes = await this.prisma.contextNote.findMany({
      where: {
        founderId,
        OR: [
          { key: { contains: query, mode: 'insensitive' } },
          { value: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: words } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return notes.map((n) => `[${n.key}] ${n.value}`);
  }

  /**
   * List all context notes for a founder.
   */
  async listAll(founderId: string) {
    return this.prisma.contextNote.findMany({
      where: { founderId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Delete a context note.
   */
  async delete(founderId: string, noteId: string) {
    return this.prisma.contextNote.deleteMany({
      where: { id: noteId, founderId },
    });
  }
}
