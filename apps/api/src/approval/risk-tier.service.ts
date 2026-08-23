import { Injectable } from '@nestjs/common';
import { RiskTier } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

/** Actions that are always Tier 3 regardless of layer defaults. */
const ALWAYS_APPROVAL_REQUIRED = [
  'ad_spend',
  'payment',
  'vendor_commitment',
  'customer_facing_communication',
  'government_filing',
  'contract_signing',
  'fund_transfer',
];

/** Actions that are always Tier 1 regardless of layer defaults. */
const ALWAYS_AUTO_EXECUTE = [
  'research_report',
  'draft_content',
  'internal_analysis',
  'competitor_scan',
  'data_retrieval',
];

export interface TierClassification {
  tier: RiskTier;
  reason: string;
  escalated: boolean;
}

@Injectable()
export class RiskTierService {
  constructor(private prisma: PrismaService) {}

  /**
   * Classify an action's risk tier based on:
   * 1. Hard-coded rules (certain actions are always Tier 3 or Tier 1)
   * 2. Founder's per-layer overrides
   * 3. Founder's per-action-type overrides
   * 4. Escalation triggers (low confidence, anomaly, SLA breach, irreversibility)
   */
  async classifyAction(
    founderId: string,
    layer: string,
    actionType: string,
    context: {
      confidence?: number;
      isAnomaly?: boolean;
      slaBreachRisk?: boolean;
      isIrreversible?: boolean;
    } = {},
  ): Promise<TierClassification> {
    // 1. Hard-coded always-approval-required
    if (ALWAYS_APPROVAL_REQUIRED.includes(actionType)) {
      return {
        tier: RiskTier.APPROVAL_REQUIRED,
        reason: `Action type "${actionType}" always requires approval`,
        escalated: false,
      };
    }

    // 2. Hard-coded always-auto-execute
    if (ALWAYS_AUTO_EXECUTE.includes(actionType)) {
      return {
        tier: RiskTier.AUTO_EXECUTE,
        reason: `Action type "${actionType}" is always auto-executed`,
        escalated: false,
      };
    }

    // 3. Check founder's per-action-type overrides
    const founder = await this.prisma.founder.findUnique({
      where: { id: founderId },
    });
    if (!founder) {
      return { tier: RiskTier.APPROVAL_REQUIRED, reason: 'Founder not found', escalated: false };
    }

    const settings = founder.autonomySettings as any;
    if (settings?.actionOverrides?.[actionType]) {
      return {
        tier: settings.actionOverrides[actionType] as RiskTier,
        reason: `Per-action-type override for "${actionType}"`,
        escalated: false,
      };
    }

    // 4. Check per-layer overrides
    if (settings?.layerOverrides?.[layer]) {
      const tier = settings.layerOverrides[layer] as RiskTier;

      // 5. Check escalation triggers — can upgrade any tier to Tier 3
      const escalation = this.checkEscalationTriggers(context, tier);
      if (escalation) {
        return {
          tier: RiskTier.APPROVAL_REQUIRED,
          reason: escalation,
          escalated: true,
        };
      }

      return {
        tier,
        reason: `Per-layer default for "${layer}"`,
        escalated: false,
      };
    }

    // Default: Tier 2 (Notify & Act) for anything not classified
    const escalation = this.checkEscalationTriggers(context, RiskTier.NOTIFY_AND_ACT);
    if (escalation) {
      return {
        tier: RiskTier.APPROVAL_REQUIRED,
        reason: escalation,
        escalated: true,
      };
    }

    return {
      tier: RiskTier.NOTIFY_AND_ACT,
      reason: 'Default tier for unclassified actions',
      escalated: false,
    };
  }

  /**
   * Check if any escalation trigger should upgrade the tier to Tier 3.
   * Returns null if no escalation, or the reason string if escalation needed.
   */
  private checkEscalationTriggers(
    context: {
      confidence?: number;
      isAnomaly?: boolean;
      slaBreachRisk?: boolean;
      isIrreversible?: boolean;
    },
    currentTier: RiskTier,
  ): string | null {
    // Don't escalate if already Tier 3
    if (currentTier === RiskTier.APPROVAL_REQUIRED) return null;

    if (context.confidence !== undefined && context.confidence < 0.6) {
      return `Low agent confidence (${(context.confidence * 100).toFixed(0)}%)`;
    }
    if (context.isAnomaly) {
      return 'Anomaly detected';
    }
    if (context.slaBreachRisk) {
      return 'SLA breach risk detected';
    }
    if (context.isIrreversible) {
      return 'Action flagged as irreversible';
    }

    return null;
  }
}
