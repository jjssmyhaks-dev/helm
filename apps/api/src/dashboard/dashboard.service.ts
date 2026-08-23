import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { TokenBudgetService } from '../queue/token-budget.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private tokenBudget: TokenBudgetService,
  ) {}

  async getDashboard(founderId: string) {
    const [agentStats, taskStats, recentActivity, tokenUsage, approvalStats] = await Promise.all([
      this.getAgentStats(founderId),
      this.getTaskStats(founderId),
      this.getRecentActivity(founderId),
      this.tokenBudget.getAllBudgets(founderId),
      this.getApprovalStats(founderId),
    ]);

    return {
      agents: agentStats,
      tasks: taskStats,
      activity: recentActivity,
      tokenUsage,
      approvals: approvalStats,
      summary: this.buildSummary(agentStats, taskStats, approvalStats),
    };
  }

  async getAgentStats(founderId: string) {
    const agents = await this.prisma.agent.findMany({ where: { founderId } });

    return Promise.all(
      agents.map(async (agent) => {
        const completedTasks = await this.prisma.task.count({
          where: { assignedAgentId: agent.id, status: 'COMPLETED' },
        });
        const failedTasks = await this.prisma.task.count({
          where: { assignedAgentId: agent.id, status: 'FAILED' },
        });
        const totalTasks = completedTasks + failedTasks;
        return {
          id: agent.id,
          name: agent.name,
          layer: agent.layer,
          status: agent.status,
          totalTasks,
          completedTasks,
          failedTasks,
          successRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      }),
    );
  }

  async getTaskStats(founderId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalTasks, completedToday, completedThisWeek, pendingTasks, failedTasks, tasksByLayer] =
      await Promise.all([
        this.prisma.task.count({ where: { founderId } }),
        this.prisma.task.count({ where: { founderId, status: 'COMPLETED', completedAt: { gte: today } } }),
        this.prisma.task.count({ where: { founderId, status: 'COMPLETED', completedAt: { gte: thisWeek } } }),
        this.prisma.task.count({ where: { founderId, status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
        this.prisma.task.count({ where: { founderId, status: 'FAILED' } }),
        this.prisma.task.groupBy({ by: ['layer'], where: { founderId, status: 'COMPLETED' }, _count: true }),
      ]);

    return {
      total: totalTasks,
      completedToday,
      completedThisWeek,
      pending: pendingTasks,
      failed: failedTasks,
      byLayer: tasksByLayer.map((t) => ({ layer: t.layer, count: t._count })),
    };
  }

  async getRecentActivity(founderId: string) {
    const activities = await this.prisma.activityLogEntry.findMany({
      where: { founderId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return activities.map((a) => ({
      id: a.id,
      action: a.action,
      details: a.details,
      createdAt: a.createdAt,
    }));
  }

  async getApprovalStats(founderId: string) {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.approval.count({ where: { founderId, status: 'PENDING' } }),
      this.prisma.approval.count({ where: { founderId, status: 'APPROVED' } }),
      this.prisma.approval.count({ where: { founderId, status: 'REJECTED' } }),
    ]);
    return { pending, approved, rejected, total: pending + approved + rejected };
  }

  private buildSummary(agentStats: any[], taskStats: any, approvalStats: any) {
    const activeAgents = agentStats.filter((a) => a.status === 'WORKING').length;
    const topAgent = agentStats.reduce((best: any, a: any) =>
      a.completedTasks > (best?.completedTasks || 0) ? a : best, null);
    return {
      activeAgents,
      totalAgents: agentStats.length,
      tasksCompletedToday: taskStats.completedToday,
      tasksCompletedWeek: taskStats.completedThisWeek,
      successRate: taskStats.total > 0
        ? Math.round(((taskStats.total - taskStats.failed) / taskStats.total) * 100)
        : 100,
      topAgent: topAgent?.name || 'None yet',
      pendingApprovals: approvalStats.pending,
    };
  }
}
