import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export interface Signal {
  id: string;
  type: string;
  publisherAgentId?: string;
  founderId?: string;
  payload: Record<string, any>;
  timestamp: Date;
}

export type SignalHandler = (signal: Signal) => void | Promise<void>;

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private handlers = new Map<string, SignalHandler[]>();
  private globalHandlers: SignalHandler[] = [];

  constructor(private prisma: PrismaService) {}

  /**
   * Publish a signal to all subscribers.
   */
  async publish(signal: Omit<Signal, 'id' | 'timestamp'>): Promise<Signal> {
    const fullSignal: Signal = {
      ...signal,
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };

    this.logger.log(`Signal published: ${signal.type}`);

    // Persist to database (only if required fields are present)
    if (signal.founderId && signal.publisherAgentId) {
      try {
        await this.prisma.eventSignal.create({
          data: {
            type: signal.type,
            publisherAgentId: signal.publisherAgentId,
            founderId: signal.founderId,
            payload: signal.payload,
          },
        });
      } catch (err) {
        this.logger.warn(`Failed to persist signal: ${err}`);
      }
    }

    // Dispatch to type-specific handlers
    const typeHandlers = this.handlers.get(signal.type) || [];
    for (const handler of typeHandlers) {
      try {
        await handler(fullSignal);
      } catch (err) {
        this.logger.error(`Handler error for signal ${signal.type}: ${err}`);
      }
    }

    // Dispatch to global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(fullSignal);
      } catch (err) {
        this.logger.error(`Global handler error for signal ${signal.type}: ${err}`);
      }
    }

    return fullSignal;
  }

  /**
   * Subscribe to specific signal types.
   */
  subscribe(type: string, handler: SignalHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
    this.logger.log(`Subscribed to signal: ${type}`);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx > -1) handlers.splice(idx, 1);
      }
    };
  }

  /**
   * Subscribe to all signals (global handler).
   */
  subscribeAll(handler: SignalHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const idx = this.globalHandlers.indexOf(handler);
      if (idx > -1) this.globalHandlers.splice(idx, 1);
    };
  }

  /**
   * Get active subscriptions for debugging.
   */
  getSubscriptions(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [type, handlers] of this.handlers) {
      result[type] = handlers.length;
    }
    result['*'] = this.globalHandlers.length;
    return result;
  }

  /**
   * Get recent signals for a founder.
   */
  async getRecentEvents(founderId: string, limit = 50): Promise<any[]> {
    return this.prisma.eventSignal.findMany({
      where: { founderId },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get subscribers for a signal type.
   */
  getSubscribers(_founderId: string, signalType: string): { type: string; handlerCount: number }[] {
    const handlers = this.handlers.get(signalType) || [];
    return [{ type: signalType, handlerCount: handlers.length }];
  }
}
