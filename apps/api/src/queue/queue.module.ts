import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SignalProcessor } from './signal.processor.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { TokenBudgetService } from './token-budget.service.js';
import { QueueController } from './queue.controller.js';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get('REDIS_URL', 'redis://localhost:6379'),
        },
        defaultJobOptions: {
          removeOnComplete: { age: 86400 }, // Keep completed jobs for 24h
          removeOnFail: { age: 604800 },   // Keep failed jobs for 7 days
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'signal-processing' },
      { name: 'agent-tasks' },
      { name: 'scheduled-scans' },
    ),
  ],
  controllers: [QueueController],
  providers: [SignalProcessor, RateLimiterService, TokenBudgetService],
  exports: [BullModule, RateLimiterService, TokenBudgetService],
})
export class QueueModule {}
