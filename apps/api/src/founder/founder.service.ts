import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class FounderService {
  constructor(private prisma: PrismaService) {}

  async getProfile(founderId: string) {
    const founder = await this.prisma.founder.findUnique({
      where: { id: founderId },
    });
    if (!founder) throw new NotFoundException('Founder not found');
    const { passwordHash, ...rest } = founder as any;
    return rest;
  }

  async updateAutonomySettings(founderId: string, settings: Record<string, unknown>) {
    return this.prisma.founder.update({
      where: { id: founderId },
      data: { autonomySettings: settings as unknown as Prisma.InputJsonValue },
    });
  }

  async updateProfile(founderId: string, data: { name?: string; businessName?: string; businessDescription?: string }) {
    return this.prisma.founder.update({
      where: { id: founderId },
      data,
    });
  }
}
