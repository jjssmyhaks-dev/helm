import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export type NotificationChannel = 'email' | 'push' | 'in_app';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface NotificationPayload {
  founderId: string;
  title: string;
  body: string;
  channel: NotificationChannel | NotificationChannel[];
  priority: NotificationPriority;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface StoredNotification {
  id: string;
  founderId: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private resendApiKey: string;

  constructor(private prisma: PrismaService) {
    this.resendApiKey = process.env.RESEND_API_KEY || '';
    if (!this.resendApiKey) {
      this.logger.warn('RESEND_API_KEY not set. Email notifications disabled.');
    }
  }

  /**
   * Send a notification through the specified channels.
   */
  async notify(payload: NotificationPayload): Promise<void> {
    const channels = Array.isArray(payload.channel) ? payload.channel : [payload.channel];

    // Always store in-app notification
    if (channels.includes('in_app') || payload.priority === 'urgent') {
      await this.storeInApp(payload);
    }

    // Send email for high/urgent priority
    if (channels.includes('email') && (payload.priority === 'high' || payload.priority === 'urgent')) {
      await this.sendEmail(payload);
    }

    // Send push notification
    if (channels.includes('push')) {
      await this.sendPush(payload);
    }
  }

  /**
   * Notify founder of a Tier 3 approval request.
   */
  async notifyApprovalRequired(founderId: string, agentName: string, actionDescription: string, approvalId: string) {
    await this.notify({
      founderId,
      title: 'Approval Required',
      body: `${agentName} needs your approval: ${actionDescription}`,
      channel: ['in_app', 'email'],
      priority: 'high',
      actionUrl: `/approvals/${approvalId}`,
    });
  }

  /**
   * Notify founder of a completed task.
   */
  async notifyTaskCompleted(founderId: string, agentName: string, taskTitle: string) {
    await this.notify({
      founderId,
      title: 'Task Completed',
      body: `${agentName} finished: ${taskTitle}`,
      channel: ['in_app'],
      priority: 'low',
    });
  }

  /**
   * Notify founder of a critical event (cash flow risk, delivery delay, etc.).
   */
  async notifyCriticalEvent(founderId: string, title: string, description: string) {
    await this.notify({
      founderId,
      title: `⚠️ ${title}`,
      body: description,
      channel: ['in_app', 'email'],
      priority: 'urgent',
    });
  }

  /**
   * Get in-app notifications for a founder.
   */
  async getNotifications(founderId: string, limit = 20): Promise<StoredNotification[]> {
    // In a real app, this would query a notifications table
    // For now, return recent activity log entries as notifications
    const activities = await this.prisma.activityLogEntry.findMany({
      where: {
        founderId,
        action: { in: ['approval_requested', 'task_completed', 'task_failed', 'scheduled_task_completed'] },
      },
      include: {
        agent: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities.map((a) => ({
      id: a.id,
      founderId,
      title: this.formatActivityTitle(a.action),
      body: `${a.agent?.name || 'Agent'}: ${JSON.stringify((a.details as any)?.title || a.action)}`,
      priority: a.action === 'approval_requested' ? 'high' as const : 'low' as const,
      read: false,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Mark a notification as read.
   */
  async markRead(notificationId: string): Promise<void> {
    // Placeholder - would update notifications table
  }

  /**
   * Get unread count for a founder.
   */
  async getUnreadCount(founderId: string): Promise<number> {
    const count = await this.prisma.activityLogEntry.count({
      where: {
        founderId,
        action: 'approval_requested',
      },
    });
    return count;
  }

  // ---------------------------------------------------------------------------
  // Email via Resend
  // ---------------------------------------------------------------------------

  private async sendEmail(payload: NotificationPayload): Promise<void> {
    if (!this.resendApiKey) return;

    try {
      const founder = await this.prisma.founder.findUnique({
        where: { id: payload.founderId },
      });
      if (!founder) return;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Helm <notifications@helm.ai>',
          to: founder.email,
          subject: payload.title,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${payload.title}</h2>
              <p style="color: #666; line-height: 1.6;">${payload.body}</p>
              ${payload.actionUrl ? `
                <a href="${process.env.FRONTEND_URL}${payload.actionUrl}"
                   style="display: inline-block; padding: 12px 24px; background: #4c6ef5; color: white; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                  View Details
                </a>
              ` : ''}
              <p style="color: #999; font-size: 12px; margin-top: 24px;">
                — Your AI Team at Helm
              </p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        this.logger.error(`Email send failed: ${await response.text()}`);
      }
    } catch (err) {
      this.logger.error(`Email notification error: ${err}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Push Notifications (Browser Push via Web Push API)
  // ---------------------------------------------------------------------------

  private async sendPush(payload: NotificationPayload): Promise<void> {
    // Browser push notifications require a service worker subscription
    // Store the push notification for delivery when the user is online
    this.logger.debug(`Push notification queued: ${payload.title}`);
  }

  // ---------------------------------------------------------------------------
  // In-App Storage
  // ---------------------------------------------------------------------------

  private async storeInApp(payload: NotificationPayload): Promise<void> {
    // Store as activity log entry
    await this.prisma.activityLogEntry.create({
      data: {
        founderId: payload.founderId,
        agentId: '', // System notification
        action: 'notification',
        details: {
          title: payload.title,
          body: payload.body,
          priority: payload.priority,
          actionUrl: payload.actionUrl,
          metadata: payload.metadata,
        } as any,
        riskTier: 'AUTO_EXECUTE',
      },
    });
  }

  private formatActivityTitle(action: string): string {
    const titles: Record<string, string> = {
      'approval_requested': 'Approval Needed',
      'task_completed': 'Task Completed',
      'task_failed': 'Task Failed',
      'scheduled_task_completed': 'Background Task Done',
    };
    return titles[action] || 'Activity';
  }
}
