import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async getRecentActivity(founderId: string, limit = 50) {
    return this.prisma.activityLogEntry.findMany({
      where: { founderId },
      include: {
        agent: { select: { id: true, name: true, layer: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getActivityByAgent(agentId: string, founderId: string, limit = 20) {
    return this.prisma.activityLogEntry.findMany({
      where: { agentId, founderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
