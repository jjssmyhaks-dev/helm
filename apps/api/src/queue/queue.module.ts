import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service.js';
import { TokenBudgetService } from './token-budget.service.js';
import { QueueController } from './queue.controller.js';

/**
 * Queue module — Redis/BullMQ disabled for Upstash HTTP compatibility.
 * Rate limiting and token budgets use pass-through (fail open).
 * Re-enable when a TCP Redis is available.
 */
@Global()
@Module({
  controllers: [QueueController],
  providers: [RateLimiterService, TokenBudgetService],
  exports: [RateLimiterService, TokenBudgetService],
})
export class QueueModule {}
