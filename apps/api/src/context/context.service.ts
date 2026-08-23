import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);

  constructor(private prisma: PrismaService) {}

  async save(founderId: string, key: string, value: string, _tags: string[] = []) {
    const existing = await this.prisma.contextNote.findFirst({
      where: { founderId, key },
    });

    if (existing) {
      return this.prisma.contextNote.update({
        where: { id: existing.id },
        data: { value },
      });
    }

    return this.prisma.contextNote.create({
      data: { founderId, key, value },
    });
  }

  async retrieveRelevant(founderId: string, query: string, limit = 10): Promise<string[]> {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return [];

    const notes = await this.prisma.contextNote.findMany({
      where: {
        founderId,
        OR: [
          { key: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    return notes.map((n) => `[${n.key}] ${n.value}`);
  }

  async listAll(founderId: string) {
    return this.prisma.contextNote.findMany({
      where: { founderId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async delete(founderId: string, noteId: string) {
    return this.prisma.contextNote.deleteMany({
      where: { id: noteId, founderId },
    });
  }
}
