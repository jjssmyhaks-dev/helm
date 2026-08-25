import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { RiskTier } from '@prisma/client';

/**
 * Action types mapped to their layers.
 * Each agent action is classified here so founders can set autonomy per-action.
 */
export const ACTION_TYPES = {
  RESEARCH: [
    { id: 'competitor_scan', name: 'Competitor Scan', description: 'Scan competitor websites and pricing', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'market_trend_scan', name: 'Market Trend Scan', description: 'Scan industry news and trends', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'pricing_benchmark', name: 'Pricing Benchmark', description: 'Compare pricing across category', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'audience_research', name: 'Audience Research', description: 'Research customer personas and sentiment', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'campaign_research', name: 'Campaign Deep-Dive', description: 'Research specific ad angles or campaigns', defaultTier: RiskTier.AUTO_EXECUTE },
  ],
  MARKETING: [
    { id: 'social_post', name: 'Social Media Post', description: 'Publish post to social platforms', defaultTier: RiskTier.NOTIFY_AND_ACT },
    { id: 'email_campaign', name: 'Email Campaign', description: 'Send marketing emails', defaultTier: RiskTier.APPROVAL_REQUIRED },
    { id: 'ad_spend', name: 'Ad Spend', description: 'Allocate or modify ad budget', defaultTier: RiskTier.APPROVAL_REQUIRED },
    { id: 'content_draft', name: 'Content Draft', description: 'Draft blog posts, landing pages', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'seo_change', name: 'SEO Change', description: 'Modify page titles, meta descriptions', defaultTier: RiskTier.NOTIFY_AND_ACT },
    { id: 'design_asset', name: 'Design Asset', description: 'Generate creative assets', defaultTier: RiskTier.AUTO_EXECUTE },
  ],
  OPERATIONS: [
    { id: 'vendor_message', name: 'Vendor Communication', description: 'Send message to vendor/supplier', defaultTier: RiskTier.APPROVAL_REQUIRED },
    { id: 'support_reply', name: 'Support Reply', description: 'Reply to customer support ticket', defaultTier: RiskTier.NOTIFY_AND_ACT },
    { id: 'process_update', name: 'Process Update', description: 'Update internal SOPs or workflows', defaultTier: RiskTier.NOTIFY_AND_ACT },
    { id: 'order_tracking', name: 'Order Tracking', description: 'Check order status and delivery', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'scheduling', name: 'Scheduling', description: 'Book meetings or manage calendar', defaultTier: RiskTier.NOTIFY_AND_ACT },
  ],
  FINANCE: [
    { id: 'transaction_categorize', name: 'Transaction Categorize', description: 'Auto-categorize bank transactions', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'expense_report', name: 'Expense Report', description: 'Generate expense reports', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'payment_initiate', name: 'Initiate Payment', description: 'Send payment to vendor or contractor', defaultTier: RiskTier.APPROVAL_REQUIRED },
    { id: 'invoice_send', name: 'Send Invoice', description: 'Create and send invoice to client', defaultTier: RiskTier.APPROVAL_REQUIRED },
    { id: 'tax_filing', name: 'Tax Filing', description: 'File tax or GST returns', defaultTier: RiskTier.APPROVAL_REQUIRED },
    { id: 'cashflow_alert', name: 'Cash Flow Alert', description: 'Alert on cash flow anomalies', defaultTier: RiskTier.AUTO_EXECUTE },
    { id: 'investor_update', name: 'Investor Update', description: 'Draft investor update email', defaultTier: RiskTier.APPROVAL_REQUIRED },
  ],
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES][number]['id'];

export interface ActionAutonomyConfig {
  layer: string;
  actionId: string;
  actionName: string;
  description: string;
  riskTier: RiskTier;
  enabled: boolean;
}

@Injectable()
export class AutonomyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all action autonomy settings for a founder.
   * Falls back to default tier if not explicitly set.
   */
  async getSettings(founderId: string): Promise<ActionAutonomyConfig[]> {
    // Get founder's saved settings
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    const savedSettings = (founder as any)?.autonomySettings as Record<string, string> | null || {};

    const configs: ActionAutonomyConfig[] = [];

    for (const [layer, actions] of Object.entries(ACTION_TYPES)) {
      for (const action of actions) {
        const key = `${layer}:${action.id}`;
        const saved = savedSettings[key];

        configs.push({
          layer,
          actionId: action.id,
          actionName: action.name,
          description: action.description,
          riskTier: saved ? (saved as RiskTier) : action.defaultTier,
          enabled: savedSettings[`${key}:enabled`] !== 'false',
        });
      }
    }

    return configs;
  }

  /**
   * Update a single action's risk tier.
   */
  async updateActionTier(
    founderId: string,
    layer: string,
    actionId: string,
    tier: RiskTier,
  ): Promise<void> {
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    const settings = ((founder as any)?.autonomySettings as Record<string, string>) || {};

    settings[`${layer}:${actionId}`] = tier;

    await this.prisma.founder.update({
      where: { id: founderId },
      data: { autonomySettings: settings } as any,
    });
  }

  /**
   * Toggle an action on/off.
   */
  async toggleAction(
    founderId: string,
    layer: string,
    actionId: string,
    enabled: boolean,
  ): Promise<void> {
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    const settings = ((founder as any)?.autonomySettings as Record<string, string>) || {};

    settings[`${layer}:${actionId}:enabled`] = String(enabled);

    await this.prisma.founder.update({
      where: { id: founderId },
      data: { autonomySettings: settings } as any,
    });
  }

  /**
   * Bulk update all actions in a layer.
   */
  async updateLayer(
    founderId: string,
    layer: string,
    tier: RiskTier,
  ): Promise<void> {
    const actions = ACTION_TYPES[layer as keyof typeof ACTION_TYPES];
    if (!actions) return;

    for (const action of actions) {
      await this.updateActionTier(founderId, layer, action.id, tier);
    }
  }

  /**
   * Get the risk tier for a specific action — used by agent execution pipeline.
   * Returns the configured tier or the default.
   */
  async getActionTier(
    founderId: string,
    layer: string,
    actionId: string,
  ): Promise<{ tier: RiskTier; enabled: boolean }> {
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    const settings = ((founder as any)?.autonomySettings as Record<string, string>) || {};

    const key = `${layer}:${actionId}`;
    const enabled = settings[`${key}:enabled`] !== 'false';
    const tier = (settings[key] as RiskTier) || this.getDefaultTier(layer, actionId);

    return { tier, enabled };
  }

  /**
   * Get summary stats for the founder.
   */
  async getSummary(founderId: string) {
    const configs = await this.getSettings(founderId);

    const byLayer: Record<string, { total: number; auto: number; notify: number; approval: number; disabled: number }> = {};

    for (const config of configs) {
      if (!byLayer[config.layer]) {
        byLayer[config.layer] = { total: 0, auto: 0, notify: 0, approval: 0, disabled: 0 };
      }
      byLayer[config.layer].total++;
      if (!config.enabled) {
        byLayer[config.layer].disabled++;
      } else if (config.riskTier === RiskTier.AUTO_EXECUTE) {
        byLayer[config.layer].auto++;
      } else if (config.riskTier === RiskTier.NOTIFY_AND_ACT) {
        byLayer[config.layer].notify++;
      } else {
        byLayer[config.layer].approval++;
      }
    }

    return {
      totalActions: configs.length,
      enabledActions: configs.filter(c => c.enabled).length,
      byLayer,
    };
  }

  private getDefaultTier(layer: string, actionId: string): RiskTier {
    const actions = ACTION_TYPES[layer as keyof typeof ACTION_TYPES];
    if (!actions) return RiskTier.APPROVAL_REQUIRED;
    const action = (actions as readonly { id: string; defaultTier: RiskTier }[]).find(a => a.id === actionId);
    return action?.defaultTier || RiskTier.APPROVAL_REQUIRED;
  }
}
