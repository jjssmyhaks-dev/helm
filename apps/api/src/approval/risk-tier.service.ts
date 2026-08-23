import { Injectable } from '@nestjs/common';
import { RiskTier } from '@prisma/client';

const ALWAYS_APPROVAL_REQUIRED = [
  'ad_spend', 'payment', 'vendor_commitment', 'customer_facing_communication',
  'government_filing', 'contract_signing', 'fund_transfer',
];

const ALWAYS_AUTO_EXECUTE = [
  'research_report', 'draft_content', 'internal_analysis', 'competitor_scan', 'data_retrieval',
];

export interface TierClassification {
  tier: RiskTier;
  reason: string;
  escalated: boolean;
}

@Injectable()
export class RiskTierService {
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
    if (ALWAYS_APPROVAL_REQUIRED.includes(actionType)) {
      return { tier: RiskTier.APPROVAL_REQUIRED, reason: `Action "${actionType}" always requires approval`, escalated: false };
    }

    if (ALWAYS_AUTO_EXECUTE.includes(actionType)) {
      return { tier: RiskTier.AUTO_EXECUTE, reason: `Action "${actionType}" is always auto-executed`, escalated: false };
    }

    // Check escalation triggers
    const escalation = this.checkEscalationTriggers(context, RiskTier.NOTIFY_AND_ACT);
    if (escalation) {
      return { tier: RiskTier.APPROVAL_REQUIRED, reason: escalation, escalated: true };
    }

    return { tier: RiskTier.NOTIFY_AND_ACT, reason: 'Default tier for unclassified actions', escalated: false };
  }

  private checkEscalationTriggers(
    context: { confidence?: number; isAnomaly?: boolean; slaBreachRisk?: boolean; isIrreversible?: boolean },
    currentTier: RiskTier,
  ): string | null {
    if (currentTier === RiskTier.APPROVAL_REQUIRED) return null;
    if (context.confidence !== undefined && context.confidence < 0.6) {
      return `Low agent confidence (${(context.confidence * 100).toFixed(0)}%)`;
    }
    if (context.isAnomaly) return 'Anomaly detected';
    if (context.slaBreachRisk) return 'SLA breach risk detected';
    if (context.isIrreversible) return 'Action flagged as irreversible';
    return null;
  }
}
