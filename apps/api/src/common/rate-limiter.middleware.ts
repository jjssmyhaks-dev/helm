import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter for public routes.
 * For production, use Redis-backed rate limiting.
 */
@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private store = new Map<string, RateLimitEntry>();

  constructor(
    private windowMs: number = 60000,
    private maxRequests: number = 30,
  ) {
    // Cleanup old entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (entry.resetAt < now) this.store.delete(key);
      }
    }, 60000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - 1);
      return next();
    }

    entry.count++;
    const remaining = Math.max(0, this.maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    if (entry.count > this.maxRequests) {
      throw new HttpException(
        `Rate limit exceeded. Try again at ${new Date(entry.resetAt).toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
