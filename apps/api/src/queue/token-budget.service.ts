import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

interface BudgetConfig {
  maxTokens: number;
  windowSeconds: number;
  costPer1kTokens: number;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  agentId?: string;
  layer?: string;
  taskId?: string;
}

export interface BudgetStatus {
  used: number;
  limit: number;
  remaining: number;
  estimatedCostUsd: number;
  resetsAt: Date;
}

const DEFAULT_BUDGETS: Record<string, BudgetConfig> = {
  'tokens:founder:daily': {
    maxTokens: 500_000,
    windowSeconds: 86400,
    costPer1kTokens: 0.003,
  },
  'tokens:founder:hourly': {
    maxTokens: 50_000,
    windowSeconds: 3600,
    costPer1kTokens: 0.003,
  },
  'tokens:layer:daily': {
    maxTokens: 150_000,
    windowSeconds: 86400,
    costPer1kTokens: 0.003,
  },
  'tokens:agent:daily': {
    maxTokens: 30_000,
    windowSeconds: 86400,
    costPer1kTokens: 0.003,
  },
};

interface BudgetEntry {
  used: number;
  windowStart: number;
}

@Injectable()
export class TokenBudgetService {
  private readonly logger = new Logger(TokenBudgetService.name);
  private budgets = new Map<string, BudgetEntry>();

  constructor(private prisma: PrismaService) {}

  private getBudget(key: string): BudgetEntry {
    const config = this.getBudgetConfig(key);
    const existing = this.budgets.get(key);
    const now = Date.now();

    if (!existing || now - existing.windowStart > config.windowSeconds * 1000) {
      const entry = { used: 0, windowStart: now };
      this.budgets.set(key, entry);
      return entry;
    }
    return existing;
  }

  async checkBudget(
    founderId: string,
    layer: string,
    agentId: string,
    estimatedTokens: number = 2000,
  ): Promise<{ allowed: boolean; reason?: string; status: BudgetStatus }> {
    const founderDaily = this.getBudget(`tokens:founder:daily:${founderId}`);
    if (founderDaily.used + estimatedTokens > DEFAULT_BUDGETS['tokens:founder:daily'].maxTokens) {
      return {
        allowed: false,
        reason: 'Founder daily token budget exhausted',
        status: this.toStatus(`tokens:founder:daily:${founderId}`),
      };
    }

    const founderHourly = this.getBudget(`tokens:founder:hourly:${founderId}`);
    if (founderHourly.used + estimatedTokens > DEFAULT_BUDGETS['tokens:founder:hourly'].maxTokens) {
      return {
        allowed: false,
        reason: 'Founder hourly token limit reached',
        status: this.toStatus(`tokens:founder:hourly:${founderId}`),
      };
    }

    const layerDaily = this.getBudget(`tokens:layer:daily:${founderId}:${layer}`);
    if (layerDaily.used + estimatedTokens > DEFAULT_BUDGETS['tokens:layer:daily'].maxTokens) {
      return {
        allowed: false,
        reason: `Layer "${layer}" daily token budget exhausted`,
        status: this.toStatus(`tokens:layer:daily:${founderId}:${layer}`),
      };
    }

    const agentDaily = this.getBudget(`tokens:agent:daily:${agentId}`);
    if (agentDaily.used + estimatedTokens > DEFAULT_BUDGETS['tokens:agent:daily'].maxTokens) {
      return {
        allowed: false,
        reason: 'Agent daily token budget exhausted',
        status: this.toStatus(`tokens:agent:daily:${agentId}`),
      };
    }

    return {
      allowed: true,
      status: this.toStatus(`tokens:founder:daily:${founderId}`),
    };
  }

  async recordUsage(founderId: string, usage: TokenUsage): Promise<void> {
    const totalTokens = usage.inputTokens + usage.outputTokens;
    const keys = [
      `tokens:founder:daily:${founderId}`,
      `tokens:founder:hourly:${founderId}`,
      ...(usage.layer ? [`tokens:layer:daily:${founderId}:${usage.layer}`] : []),
      ...(usage.agentId ? [`tokens:agent:daily:${usage.agentId}`] : []),
    ];

    for (const key of keys) {
      const entry = this.getBudget(key);
      entry.used += totalTokens;
    }

    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: usage.agentId || '',
        action: 'llm_call',
        details: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens,
          model: usage.model,
          layer: usage.layer,
          taskId: usage.taskId,
        } as any,
        riskTier: 'AUTO_EXECUTE',
      },
    });

    const founderDaily = this.getBudget(`tokens:founder:daily:${founderId}`);
    const usagePercent = (founderDaily.used / DEFAULT_BUDGETS['tokens:founder:daily'].maxTokens) * 100;
    if (usagePercent > 80) {
      this.logger.warn(
        `Founder ${founderId} token usage at ${usagePercent.toFixed(0)}% of daily budget`,
      );
    }
  }

  async getAllBudgets(founderId: string): Promise<Record<string, BudgetStatus>> {
    return {
      daily: this.toStatus(`tokens:founder:daily:${founderId}`),
      hourly: this.toStatus(`tokens:founder:hourly:${founderId}`),
      research: this.toStatus(`tokens:layer:daily:${founderId}:RESEARCH`),
      marketing: this.toStatus(`tokens:layer:daily:${founderId}:MARKETING`),
      operations: this.toStatus(`tokens:layer:daily:${founderId}:OPERATIONS`),
      finance: this.toStatus(`tokens:layer:daily:${founderId}:FINANCE`),
    };
  }

  private toStatus(key: string): BudgetStatus {
    const config = this.getBudgetConfig(key);
    const entry = this.getBudget(key);
    return {
      used: entry.used,
      limit: config.maxTokens,
      remaining: Math.max(0, config.maxTokens - entry.used),
      estimatedCostUsd: (entry.used / 1000) * config.costPer1kTokens,
      resetsAt: new Date(entry.windowStart + config.windowSeconds * 1000),
    };
  }

  private getBudgetConfig(key: string): BudgetConfig {
    if (key.includes('hourly')) return DEFAULT_BUDGETS['tokens:founder:hourly'];
    if (key.includes('layer:')) return DEFAULT_BUDGETS['tokens:layer:daily'];
    if (key.includes('agent:')) return DEFAULT_BUDGETS['tokens:agent:daily'];
    return DEFAULT_BUDGETS['tokens:founder:daily'];
  }
}
