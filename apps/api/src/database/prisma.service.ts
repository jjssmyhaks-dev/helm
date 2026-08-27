import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * PrismaService — wraps PrismaClient with PrismaPg adapter (Prisma 7+).
 * Uses a Proxy to forward all property access to the underlying PrismaClient
 * so existing code like `this.prisma.founder.findMany()` works unchanged.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private _client!: PrismaClient;

  // This is the Proxy target — all property reads are forwarded
  [key: string]: any;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const adapter = new PrismaPg({ connectionString });
    this._client = new PrismaClient({ adapter });

    // Return a Proxy that forwards all model accessors and methods to the underlying client
    return new Proxy(this, {
      get(target, prop, receiver) {
        // Let NestJS lifecycle hooks and internal methods work on the real instance
        const ownKeys = ['onModuleInit', 'onModuleDestroy', 'logger', '_client', 'constructor'];
        if (typeof prop === 'string' && ownKeys.includes(prop)) {
          const val = Reflect.get(target, prop, receiver);
          return typeof val === 'function' ? val.bind(target) : val;
        }
        // Symbol properties (like Symbol.toPrimitive, etc.) — pass through
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }
        // Forward everything else to the underlying PrismaClient
        const clientVal = (target._client as any)[prop];
        if (typeof clientVal === 'function') {
          return clientVal.bind(target._client);
        }
        return clientVal;
      },
    }) as any;
  }

  async onModuleInit() {
    await this._client.$connect();
    this.logger.log('Connected to database via PrismaPg adapter');
  }

  async onModuleDestroy() {
    await this._client.$disconnect();
  }
}
