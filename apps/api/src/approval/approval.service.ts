import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { EventBusService } from '../event/event-bus.service.js';
import { RiskTier, Prisma } from '@prisma/client';

@Injectable()
export class ApprovalService {
  constructor(
    private prisma: PrismaService,
    private eventBus: EventBusService,
  ) {}

  /**
   * Create an approval request (called by agents when action is Tier 3).
   * Returns the created approval — the requesting agent should persist
   * its state and continue other work asynchronously.
   */
  async createApprovalRequest(params: {
    taskId: string;
    agentId: string;
    founderId: string;
    actionDescription: string;
    actionPayload: Record<string, unknown>;
    reasoning: string;
    riskTier: RiskTier;
  }) {
    // Update task status
    await this.prisma.task.update({
      where: { id: params.taskId },
      data: { status: 'WAITING_APPROVAL' },
    });

    const approval = await this.prisma.approval.create({
      data: {
        taskId: params.taskId,
        agentId: params.agentId,
        founderId: params.founderId,
        actionDescription: params.actionDescription,
        actionPayload: params.actionPayload as unknown as Prisma.InputJsonValue,
        reasoning: params.reasoning,
        riskTier: params.riskTier,
      },
      include: {
        agent: { select: { id: true, name: true, layer: true } },
        task: { select: { id: true, title: true } },
      },
    });

    // Log activity
    await this.prisma.activityLogEntry.create({
      data: {
        founderId: params.founderId,
        agentId: params.agentId,
        action: 'approval_requested',
        details: { approvalId: approval.id, description: params.actionDescription } as unknown as Prisma.InputJsonValue,
        riskTier: params.riskTier,
      },
    });

    return approval;
  }

  /** Get pending approvals for a founder. */
  async getPendingApprovals(founderId: string) {
    return this.prisma.approval.findMany({
      where: { founderId, status: 'PENDING' },
      include: {
        agent: { select: { id: true, name: true, layer: true } },
        task: { select: { id: true, title: true, layer: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Approve an action. */
  async approve(approvalId: string, founderId: string, reason?: string) {
    const approval = await this.getOrThrow(approvalId, founderId);

    await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: 'APPROVED',
        resolutionNote: reason,
        resolvedAt: new Date(),
      },
    });

    // Update task status back to in_progress so the agent can resume
    await this.prisma.task.update({
      where: { id: approval.taskId },
      data: { status: 'IN_PROGRESS' },
    });

    // Log activity
    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: approval.agentId,
        action: 'approval_approved',
        details: { approvalId, description: approval.actionDescription } as unknown as Prisma.InputJsonValue,
        riskTier: approval.riskTier,
      },
    });

    return { success: true, approvalId };
  }

  /** Reject an action. */
  async reject(approvalId: string, founderId: string, reason?: string) {
    const approval = await this.getOrThrow(approvalId, founderId);

    await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: 'REJECTED',
        resolutionNote: reason,
        resolvedAt: new Date(),
      },
    });

    await this.prisma.task.update({
      where: { id: approval.taskId },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: approval.agentId,
        action: 'approval_rejected',
        details: { approvalId, description: approval.actionDescription, reason } as unknown as Prisma.InputJsonValue,
        riskTier: approval.riskTier,
      },
    });

    return { success: true, approvalId };
  }

  /** Edit and approve — founder modifies the action payload before approving. */
  async editAndApprove(
    approvalId: string,
    founderId: string,
    editedPayload: Record<string, unknown>,
    reason?: string,
  ) {
    const approval = await this.getOrThrow(approvalId, founderId);

    await this.prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: 'EDITED',
        editedPayload: editedPayload as unknown as Prisma.InputJsonValue,
        resolutionNote: reason,
        resolvedAt: new Date(),
      },
    });

    await this.prisma.task.update({
      where: { id: approval.taskId },
      data: {
        status: 'IN_PROGRESS',
        result: editedPayload as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.activityLogEntry.create({
      data: {
        founderId,
        agentId: approval.agentId,
        action: 'approval_edited',
        details: { approvalId, description: approval.actionDescription, edits: editedPayload } as unknown as Prisma.InputJsonValue,
        riskTier: approval.riskTier,
      },
    });

    return { success: true, approvalId };
  }

  private async getOrThrow(approvalId: string, founderId: string) {
    const approval = await this.prisma.approval.findFirst({
      where: { id: approvalId, founderId },
    });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'PENDING') throw new BadRequestException('Approval already resolved');
    return approval;
  }
}
