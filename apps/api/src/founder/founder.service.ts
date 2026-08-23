import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class FounderService {
  constructor(private prisma: PrismaService) {}

  async getProfile(founderId: string) {
    const founder = await this.prisma.founder.findUnique({
      where: { id: founderId },
    });
    if (!founder) throw new NotFoundException('Founder not found');
    return founder;
  }

  async updateProfile(founderId: string, data: { name?: string; businessName?: string; industry?: string; businessType?: string }) {
    return this.prisma.founder.update({
      where: { id: founderId },
      data,
    });
  }
}
