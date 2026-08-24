import { RiskTierService } from './risk-tier.service';
import { RiskTier } from '@prisma/client';

describe('RiskTierService', () => {
  let service: RiskTierService;

  beforeEach(() => {
    service = new RiskTierService();
  });

  describe('classifyAction', () => {
    it('should classify ad_spend as APPROVAL_REQUIRED', async () => {
      const result = await service.classifyAction('founder-1', 'MARKETING', 'ad_spend');
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(false);
    });

    it('should classify research_report as AUTO_EXECUTE', async () => {
      const result = await service.classifyAction('founder-1', 'RESEARCH', 'research_report');
      expect(result.tier).toBe(RiskTier.AUTO_EXECUTE);
      expect(result.escalated).toBe(false);
    });

    it('should classify payment as APPROVAL_REQUIRED', async () => {
      const result = await service.classifyAction('founder-1', 'FINANCE', 'payment');
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
    });

    it('should classify internal_analysis as AUTO_EXECUTE', async () => {
      const result = await service.classifyAction('founder-1', 'RESEARCH', 'internal_analysis');
      expect(result.tier).toBe(RiskTier.AUTO_EXECUTE);
    });

    it('should escalate to APPROVAL_REQUIRED when confidence is low', async () => {
      const result = await service.classifyAction('founder-1', 'MARKETING', 'general', {
        confidence: 0.4,
      });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(true);
    });

    it('should escalate when action is irreversible', async () => {
      const result = await service.classifyAction('founder-1', 'OPERATIONS', 'general', {
        isIrreversible: true,
      });
      expect(result.tier).toBe(RiskTier.APPROVAL_REQUIRED);
      expect(result.escalated).toBe(true);
    });

    it('should default to NOTIFY_AND_ACT for unknown actions', async () => {
      const result = await service.classifyAction('founder-1', 'MARKETING', 'unknown_action');
      expect(result.tier).toBe(RiskTier.NOTIFY_AND_ACT);
    });
  });
});
