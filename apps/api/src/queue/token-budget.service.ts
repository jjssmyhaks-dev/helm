import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../database/prisma.service.js';

interface BudgetConfig {
  /** Maximum tokens per window */
  maxTokens: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Cost per 1K tokens (for tracking spend) */
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

/** Default budgets — founder-level daily limits */
const DEFAULT_BUDGETS: Record<string, BudgetConfig> = {
  'tokens:founder:daily': {
    maxTokens: 500_000,
    windowSeconds: 86400,
    costPer1kTokens: 0.003, // Claude Sonnet average
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

@Injectable()
export class TokenBudgetService {
  private readonly logger = new Logger(TokenBudgetService.name);
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  /**
   * Check if an agent has remaining token budget before making an LLM call.
   */
  async checkBudget(
    founderId: string,
    layer: string,
    agentId: string,
    estimatedTokens: number = 2000,
  ): Promise<{ allowed: boolean; reason?: string; status: BudgetStatus }> {
    // Check founder daily budget
    const founderDaily = await this.getBudgetStatus(`tokens:founder:daily:${founderId}`);
    if (founderDaily.used + estimatedTokens > founderDaily.limit) {
      return {
        allowed: false,
        reason: 'Founder daily token budget exhausted',
        status: founderDaily,
      };
    }

    // Check founder hourly budget
    const founderHourly = await this.getBudgetStatus(`tokens:founder:hourly:${founderId}`);
    if (founderHourly.used + estimatedTokens > founderHourly.limit) {
      return {
        allowed: false,
        reason: 'Founder hourly token limit reached',
        status: founderHourly,
      };
    }

    // Check layer daily budget
    const layerDaily = await this.getBudgetStatus(`tokens:layer:daily:${founderId}:${layer}`);
    if (layerDaily.used + estimatedTokens > layerDaily.limit) {
      return {
        allowed: false,
        reason: `Layer "${layer}" daily token budget exhausted`,
        status: layerDaily,
      };
    }

    // Check agent daily budget
    const agentDaily = await this.getBudgetStatus(`tokens:agent:daily:${agentId}`);
    if (agentDaily.used + estimatedTokens > agentDaily.limit) {
      return {
        allowed: false,
        reason: 'Agent daily token budget exhausted',
        status: agentDaily,
      };
    }

    return {
      allowed: true,
      status: founderDaily,
    };
  }

  /**
   * Record token usage after an LLM call completes.
   */
  async recordUsage(founderId: string, usage: TokenUsage): Promise<void> {
    const totalTokens = usage.inputTokens + usage.outputTokens;
    const now = Date.now();

    // Record to all relevant budget counters
    const keys = [
      `tokens:founder:daily:${founderId}`,
      `tokens:founder:hourly:${founderId}`,
      ...(usage.layer ? [`tokens:layer:daily:${founderId}:${usage.layer}`] : []),
      ...(usage.agentId ? [`tokens:agent:daily:${usage.agentId}`] : []),
    ];

    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      const config = this.getBudgetConfig(key);
      pipeline.incrby(key, totalTokens);
      pipeline.expire(key, config.windowSeconds);
    }
    await pipeline.exec();

    // Persist to activity log for audit trail
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

    // Log warning if approaching budget limits
    const founderDaily = await this.getBudgetStatus(`tokens:founder:daily:${founderId}`);
    const usagePercent = (founderDaily.used / founderDaily.limit) * 100;
    if (usagePercent > 80) {
      this.logger.warn(
        `Founder ${founderId} token usage at ${usagePercent.toFixed(0)}% of daily budget (${founderDaily.used}/${founderDaily.limit})`,
      );
    }
  }

  /**
   * Get budget status for a specific key.
   */
  async getBudgetStatus(key: string): Promise<BudgetStatus> {
    const config = this.getBudgetConfig(key);
    const used = parseInt((await this.redis.get(key)) || '0', 10);
    const now = Date.now();
    const ttl = await this.redis.ttl(key);

    return {
      used,
      limit: config.maxTokens,
      remaining: Math.max(0, config.maxTokens - used),
      estimatedCostUsd: (used / 1000) * config.costPer1kTokens,
      resetsAt: new Date(now + (ttl > 0 ? ttl * 1000 : config.windowSeconds * 1000)),
    };
  }

  /**
   * Get all budget statuses for a founder (for dashboard display).
   */
  async getAllBudgets(founderId: string): Promise<Record<string, BudgetStatus>> {
    return {
      daily: await this.getBudgetStatus(`tokens:founder:daily:${founderId}`),
      hourly: await this.getBudgetStatus(`tokens:founder:hourly:${founderId}`),
      research: await this.getBudgetStatus(`tokens:layer:daily:${founderId}:RESEARCH`),
      marketing: await this.getBudgetStatus(`tokens:layer:daily:${founderId}:MARKETING`),
      operations: await this.getBudgetStatus(`tokens:layer:daily:${founderId}:OPERATIONS`),
      finance: await this.getBudgetStatus(`tokens:layer:daily:${founderId}:FINANCE`),
    };
  }

  private getBudgetConfig(key: string): BudgetConfig {
    // Match key pattern to find the right config
    if (key.includes('hourly')) return DEFAULT_BUDGETS['tokens:founder:hourly'];
    if (key.includes('layer:')) return DEFAULT_BUDGETS['tokens:layer:daily'];
    if (key.includes('agent:')) return DEFAULT_BUDGETS['tokens:agent:daily'];
    return DEFAULT_BUDGETS['tokens:founder:daily'];
  }
}
