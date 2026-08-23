import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@prisma/client';

export interface SignalPayload {
  type: string;
  publisherAgentId: string;
  founderId: string;
  payload: Record<string, unknown>;
}

export type SignalHandler = (signal: SignalPayload) => Promise<void>;

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private pubClient!: Redis;
  private subClient!: Redis;
  private handlers = new Map<string, SignalHandler[]>();

  constructor(
    private prisma: PrismaService,
    @InjectQueue('signal-processing') private signalQueue: Queue,
  ) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.pubClient = new Redis(redisUrl);
    this.subClient = new Redis(redisUrl);

    this.subClient.on('message', async (channel, message) => {
      try {
        const signal: SignalPayload = JSON.parse(message);
        const channelHandlers = this.handlers.get(channel) || [];
        await Promise.allSettled(channelHandlers.map((h) => h(signal)));
      } catch (err) {
        this.logger.error(`Error handling signal on ${channel}:`, err);
      }
    });

    this.logger.log('Event Bus connected to Redis');
  }

  onModuleDestroy() {
    this.pubClient?.disconnect();
    this.subClient?.disconnect();
  }

  /**
   * Publish a signal to the event bus.
   * Persists to DB for audit trail and notifies all subscribers.
   */
  async publish(signal: SignalPayload): Promise<void> {
    // Persist to database for audit trail
    await this.prisma.eventSignal.create({
      data: {
        type: signal.type,
        publisherAgentId: signal.publisherAgentId,
        founderId: signal.founderId,
        payload: signal.payload as unknown as Prisma.InputJsonValue,
      },
    });

    // Publish to Redis for real-time delivery
    const channel = this.channelName(signal.founderId, signal.type);
    await this.pubClient.publish(channel, JSON.stringify(signal));

    // Also publish to founder-level wildcard channel for global orchestrator
    const wildcardChannel = `helm:${signal.founderId}:*`;
    await this.pubClient.publish(wildcardChannel, JSON.stringify(signal));

    // Enqueue to BullMQ for durable processing with retry
    // This ensures signals survive server restarts and are retried on failure
    await this.signalQueue.add(
      `signal-${signal.type}`,
      {
        type: signal.type,
        publisherAgentId: signal.publisherAgentId,
        founderId: signal.founderId,
        payload: signal.payload,
      },
      {
        jobId: `sig-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        priority: this.getSignalPriority(signal.type),
      },
    );

    this.logger.debug(`Published signal: ${signal.type} from agent ${signal.publisherAgentId}`);
  }

  /**
   * Subscribe an agent to a signal type.
   * Uses Redis pub/sub for real-time delivery.
   */
  async subscribe(
    founderId: string,
    agentId: string,
    signalType: string,
    handler: SignalHandler,
  ): Promise<void> {
    const channel = this.channelName(founderId, signalType);

    // Register in-memory handler
    const existing = this.handlers.get(channel) || [];
    existing.push(handler);
    this.handlers.set(channel, existing);

    // Subscribe to Redis channel (idempotent)
    await this.subClient.subscribe(channel);

    this.logger.debug(`Agent ${agentId} subscribed to ${signalType}`);
  }

  /**
   * Get all subscribers for a given signal type (for debug/admin).
   */
  async getSubscribers(founderId: string, signalType: string) {
    return this.prisma.eventSubscription.findMany({
      where: { founderId, signalType },
      include: { agent: { select: { id: true, name: true, layer: true } } },
    });
  }

  /**
   * Get recent events for a founder (activity feed).
   */
  async getRecentEvents(founderId: string, limit = 50) {
    return this.prisma.eventSignal.findMany({
      where: { founderId },
      include: { publisherAgent: { select: { id: true, name: true, layer: true } } },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  private channelName(founderId: string, signalType: string): string {
    return `helm:${founderId}:${signalType}`;
  }

  /**
   * Assign priority to signals — financial and urgent signals get higher priority.
   * Lower number = higher priority in BullMQ.
   */
  private getSignalPriority(signalType: string): number {
    // High priority: financial risks, delivery delays
    if (signalType.startsWith('cashflow.') || signalType === 'delivery.delayed') return 1;
    // Medium-high: budget constraints, expense spikes
    if (signalType.includes('budget') || signalType.includes('expense')) return 2;
    // Medium: operational signals
    if (signalType.startsWith('operations.') || signalType.startsWith('quality.')) return 3;
    // Normal: research and marketing signals
    return 5;
  }
}
