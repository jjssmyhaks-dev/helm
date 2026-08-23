import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AgentStatus } from '@prisma/client';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  async listAgents(founderId: string, layer?: string) {
    return this.prisma.agent.findMany({
      where: {
        founderId,
        ...(layer ? { layer: layer as any } : {}),
      },
      orderBy: [{ layer: 'asc' }, { name: 'asc' }],
    });
  }

  async getAgent(agentId: string, founderId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, founderId },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async getAgentActivity(agentId: string, founderId: string, limit = 20) {
    const agent = await this.prisma.agent.findFirst({
      where: { id: agentId, founderId },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    return this.prisma.activityLogEntry.findMany({
      where: { agentId, founderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async updateAgentStatus(agentId: string, status: AgentStatus) {
    return this.prisma.agent.update({
      where: { id: agentId },
      data: { status },
    });
  }
}
