import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './database/prisma.service.js';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('api/health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'error', timestamp: new Date().toISOString() };
    }
  }
}
