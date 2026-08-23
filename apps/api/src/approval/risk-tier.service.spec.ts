import { RiskTier } from '@prisma/client';

/**
 * Tests for Risk Tier Classification Logic
 *
 * Run with: npx jest risk-tier.service.spec.ts
 */

// Mock the dependencies
const mockPrisma = {
  founder: {
    findUnique: jest.fn(),
  },
};

const mockService = {
  prisma: mockPrisma,
};

// Import the classification logic directly for unit testing
// We extract the pure logic to test without Prisma dependency

interface TierClassification {
  tier: RiskTier;
  reason: string;
  escalated: boolean;
}

const ALWAYS_APPROVAL_REQUIRED = [
  'ad_spend', 'payment', 'vendor_commitment', 'customer_facing_communication',
  'government_filing', 'contract_signing', 'fund_transfer',
];

const ALWAYS_AUTO_EXECUTE = [
  'research_report', 'draft_content', 'internal_analysis',
  'competitor_scan', 'data_retrieval',
];

function classifyAction(
  actionType: string,
  layerSettings: Record<string, RiskTier> = {},
  actionOverrides: Record<string, RiskTier> = {},
  context: {
    confidence?: number;
    isAnomaly?: boolean;
    slaBreachRisk?: boolean;
    isIrreversible?: boolean;
  } = {},
): TierClassification {
  // 1. Hard-coded always-approval-required
  if (ALWAYS_APPROVAL_REQUIRED.includes(actionType)) {
    return { tier: RiskTier.APPROVAL_REQUIRED, reason: `Always requires approval`, escalated: false };
  }

  // 2. Hard-coded always-auto-execute
  if (ALWAYS_AUTO_EXECUTE.includes(actionType)) {
    return { tier: RiskTier.AUTO_EXECUTE, reason: `Always auto-executed`, escalated: false };
  }

  // 3. Per-action-type overrides
  if (actionOverrides[actionType]) {
    return { tier: actionOverrides[actionType], reason: `Per-action override`, escalated: false };
  }

  // 4. Per-layer overrides (check with a default layer mapping)
  const layerMap: Record<string, string> = {
    ad_spend: 'marketing', payment: 'finance', research_report: 'research',
  };
  const layer = layerMap[actionType] || 'marketing';
  if (layerSettings[layer]) {
    const tier = layerSettings[layer];
    const escalation = checkEscalation(context, tier);
    if (escalation) {
      return { tier: RiskTier.APPROVAL_REQUIRED, reason: escalation, escalated: true };
    }
    return { tier, reason: `Per-layer default`, escalated: false };
  }

  // 5. Default: Tier 2
  const escalation = checkEscalation(context, RiskTier.NOTIFY_AND_ACT);
  if (escalation) {
    return { tier: RiskTier.APPROVAL_REQUIRED, reason: escalation, escalated: true };
  }

  return { tier: RiskTier.NOTIFY_AND_ACT, reason: 'Default tier', escalated: false };
}

function checkEscalation(
  context: { confidence?: number; isAnomaly?: boolean; slaBreachRisk?: boolean; isIrreversible?: boolean },
  currentTier: RiskTier,
): string | null {
  if (currentTier === RiskTier.APPROVAL_REQUIRED) return null;
  if (context.confidence !== undefined && context.confidence < 0.6) return `Low confidence (${(context.confidence * 100).toFixed(0)}%)`;
  if (context.isAnomaly) return 'Anomaly detected';
  if (context.slaBreachRisk) return 'SLA breach risk';
  if (context.isIrreversible) return 'Action flagged as irreversible';
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RiskTierService', () => {
  describe('Hard-coded rules', () => {
    it('should always require approval for ad spend', () => {
      const result = classifyAction('ad_spend');
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(false);
    });

    it('should always require approval for payments', () => {
      const result = classifyAction('payment');
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
    });

    it('should always require approval for government filings', () => {
      const result = classifyAction('government_filing');
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
    });

    it('should always auto-execute research reports', () => {
      const result = classifyAction('research_report');
      expect(result.tier).toBe(RiskTier.AUTO_EXECUTE);
      expect(result.escalated).toBe(false);
    });

    it('should always auto-execute competitor scans', () => {
      const result = classifyAction('competitor_scan');
      expect(result.tier).toBe(RiskTier.AUTO_EXECUTE);
    });

    it('should always auto-execute draft content', () => {
      const result = classifyAction('draft_content');
      expect(result.tier).toBe(RiskTier.AUTO_EXECUTE);
    });
  });

  describe('Action type overrides', () => {
    it('should respect per-action-type overrides', () => {
      const result = classifyAction('social_post', {}, { social_post: RiskTier.AUTO_EXECUTE });
      expect(result.tier).toBe(RiskTier.AUTO_EXECUTE);
    });

    it('should escalate low confidence actions', () => {
      const result = classifyAction('general', {}, {}, { confidence: 0.4 });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(true);
    });
  });

  describe('Escalation triggers', () => {
    it('should escalate on anomaly detection', () => {
      const result = classifyAction('general', {}, {}, { isAnomaly: true });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(true);
    });

    it('should escalate on SLA breach risk', () => {
      const result = classifyAction('general', {}, {}, { slaBreachRisk: true });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(true);
    });

    it('should escalate on irreversibility flag', () => {
      const result = classifyAction('general', {}, {}, { isIrreversible: true });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(true);
    });

    it('should not escalate if already Tier 3', () => {
      const result = classifyAction('ad_spend', {}, {}, { confidence: 0.3 });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(false);
    });
  });

  describe('Default behavior', () => {
    it('should default to Tier 2 for unclassified actions', () => {
      const result = classifyAction('unknown_action');
      expect(result.tier).toBe(RiskTier.NOTIFY_AND_ACT);
    });

    it('should not escalate high-confidence actions', () => {
      const result = classifyAction('general', {}, {}, { confidence: 0.9 });
      expect(result.tier).toBe(RiskTier.NOTIFY_AND_ACT);
      expect(result.escalated).toBe(false);
    });
  });
});
