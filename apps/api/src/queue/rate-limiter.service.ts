import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetsAt: Date;
  retryAfterMs?: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  'llm:founder': { maxRequests: 100, windowSeconds: 3600 },
  'llm:founder:minute': { maxRequests: 10, windowSeconds: 60 },
  'llm:agent': { maxRequests: 30, windowSeconds: 3600 },
  'mcp:founder': { maxRequests: 200, windowSeconds: 3600 },
  'mcp:connector': { maxRequests: 50, windowSeconds: 3600 },
  'events:founder': { maxRequests: 500, windowSeconds: 3600 },
  'chat:founder': { maxRequests: 60, windowSeconds: 3600 },
  'chat:founder:minute': { maxRequests: 5, windowSeconds: 60 },
};

interface WindowEntry {
  timestamp: number;
  id: string;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private windows = new Map<string, WindowEntry[]>();

  async checkRateLimit(
    key: string,
    config?: Partial<RateLimitConfig>,
  ): Promise<RateLimitResult> {
    const limit = { ...DEFAULT_LIMITS[key], ...config };
    if (!limit.maxRequests || !limit.windowSeconds) {
      return { allowed: true, remaining: Infinity, resetsAt: new Date() };
    }

    const now = Date.now();
    const windowStart = now - limit.windowSeconds * 1000;

    if (!this.windows.has(key)) {
      this.windows.set(key, []);
    }
    const entries = this.windows.get(key)!;

    // Remove expired entries
    const fresh = entries.filter((e) => e.timestamp > windowStart);
    this.windows.set(key, fresh);

    const resetsAt = new Date(now + limit.windowSeconds * 1000);

    if (fresh.length >= limit.maxRequests) {
      this.logger.warn(`Rate limit exceeded for ${key}: ${fresh.length}/${limit.maxRequests}`);
      return {
        allowed: false,
        remaining: 0,
        resetsAt,
        retryAfterMs: limit.windowSeconds * 1000,
      };
    }

    // Add current request
    fresh.push({ timestamp: now, id: `${now}-${Math.random().toString(36).slice(2)}` });

    return {
      allowed: true,
      remaining: limit.maxRequests - fresh.length,
      resetsAt,
    };
  }

  async getUsage(key: string): Promise<{ count: number; limit: number; resetsAt: Date }> {
    const config = DEFAULT_LIMITS[key];
    if (!config) return { count: 0, limit: Infinity, resetsAt: new Date() };

    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;
    const entries = (this.windows.get(key) || []).filter((e) => e.timestamp > windowStart);

    return {
      count: entries.length,
      limit: config.maxRequests,
      resetsAt: new Date(now + config.windowSeconds * 1000),
    };
  }

  async reset(key: string): Promise<void> {
    this.windows.delete(key);
  }
}
