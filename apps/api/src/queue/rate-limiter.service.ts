import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetsAt: Date;
  retryAfterMs?: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  // LLM calls per founder
  'llm:founder': { maxRequests: 100, windowSeconds: 3600 },     // 100/hour
  'llm:founder:minute': { maxRequests: 10, windowSeconds: 60 }, // 10/minute
  // LLM calls per agent
  'llm:agent': { maxRequests: 30, windowSeconds: 3600 },        // 30/hour per agent
  // MCP connector calls per founder
  'mcp:founder': { maxRequests: 200, windowSeconds: 3600 },     // 200/hour
  'mcp:connector': { maxRequests: 50, windowSeconds: 3600 },    // 50/hour per connector
  // Event bus publishes per founder
  'events:founder': { maxRequests: 500, windowSeconds: 3600 },   // 500/hour
  // Chat messages per founder
  'chat:founder': { maxRequests: 60, windowSeconds: 3600 },     // 60/hour
  'chat:founder:minute': { maxRequests: 5, windowSeconds: 60 }, // 5/minute
};

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private redis: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  /**
   * Check and consume a rate limit slot.
   * Uses sliding window counter in Redis.
   */
  async checkRateLimit(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const limit = { ...DEFAULT_LIMITS[key], ...config };
    if (!limit.maxRequests || !limit.windowSeconds) {
      // No limit configured — allow
      return { allowed: true, remaining: Infinity, resetsAt: new Date() };
    }

    const now = Date.now();
    const windowStart = now - limit.windowSeconds * 1000;
    const redisKey = `ratelimit:${key}`;

    // Use Redis sorted set for sliding window
    const pipeline = this.redis.pipeline();
    // Remove old entries
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    // Count current entries
    pipeline.zcard(redisKey);
    // Add current request
    pipeline.zadd(redisKey, now.toString(), `${now}-${Math.random().toString(36).slice(2)}`);
    // Set expiry
    pipeline.expire(redisKey, limit.windowSeconds);

    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    const resetsAt = new Date(now + limit.windowSeconds * 1000);
    const remaining = Math.max(0, limit.maxRequests - currentCount - 1);

    if (currentCount >= limit.maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${key}: ${currentCount}/${limit.maxRequests}`);
      return {
        allowed: false,
        remaining: 0,
        resetsAt,
        retryAfterMs: limit.windowSeconds * 1000,
      };
    }

    return { allowed: true, remaining, resetsAt };
  }

  /**
   * Get current usage for a rate limit key.
   */
  async getUsage(key: string): Promise<{ count: number; limit: number; resetsAt: Date }> {
    const config = DEFAULT_LIMITS[key];
    if (!config) return { count: 0, limit: Infinity, resetsAt: new Date() };

    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;
    const redisKey = `ratelimit:${key}`;

    await this.redis.zremrangebyscore(redisKey, 0, windowStart);
    const count = await this.redis.zcard(redisKey);

    return {
      count,
      limit: config.maxRequests,
      resetsAt: new Date(now + config.windowSeconds * 1000),
    };
  }

  /**
   * Reset rate limit for a key.
   */
  async reset(key: string): Promise<void> {
    await this.redis.del(`ratelimit:${key}`);
  }
}
