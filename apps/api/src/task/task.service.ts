import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async getTask(taskId: string, founderId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, founderId },
      include: {
        assignedAgent: { select: { id: true, name: true, layer: true } },
        approval: true,
        subTasks: {
          include: {
            assignedAgent: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async listTasks(founderId: string, status?: TaskStatus, layer?: string) {
    return this.prisma.task.findMany({
      where: {
        founderId,
        ...(status ? { status } : {}),
        ...(layer ? { layer: layer as any } : {}),
      },
      include: {
        assignedAgent: { select: { id: true, name: true, layer: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async updateTaskStatus(taskId: string, founderId: string, status: TaskStatus) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, founderId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        ...(status === TaskStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
    });
  }
}
