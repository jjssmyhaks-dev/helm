import { LeadScoringService } from './lead-scoring.service';

// Mock PrismaService
const mockPrisma = {
  lead: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  founderContext: {
    findUnique: jest.fn(),
  },
  founder: {
    findUnique: jest.fn(),
  },
  leadScore: {
    create: jest.fn(),
  },
} as any;

// Mock LLMService
const mockLlm = {
  complete: jest.fn(),
} as any;

describe('LeadScoringService', () => {
  let service: LeadScoringService;

  const mockLead = {
    id: 'lead-1',
    founderId: 'f1',
    name: 'John Doe',
    email: 'john@acme.com',
    company: 'Acme Inc',
    title: 'CEO',
    source: 'website',
    website: 'https://acme.com',
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    activities: [
      { type: 'email_sent', description: 'Intro email' },
      { type: 'call', description: 'Discovery call' },
    ],
    lastContactedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  };

  const mockFounder = {
    id: 'f1',
    businessType: 'SaaS',
    industry: 'tech',
    businessName: 'Helm',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadScoringService(mockPrisma, mockLlm);

    mockPrisma.lead.findUnique.mockResolvedValue(mockLead);
    mockPrisma.founderContext.findUnique.mockResolvedValue({ goals: ['Grow revenue'] });
    mockPrisma.founder.findUnique.mockResolvedValue(mockFounder);
  });

  describe('scoreLead (AI path)', () => {
    it('should score a lead using AI and store the result', async () => {
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({
          fitScore: 75,
          engagementScore: 60,
          intentScore: 80,
          factors: {
            strengths: ['Strong company', 'Active engagement'],
            weaknesses: ['Small team'],
            recommendation: 'Good fit — prioritize outreach',
          },
        }),
      });
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-1' });

      const result = await service.scoreLead('lead-1');

      expect(result).toBeDefined();
      expect(mockPrisma.leadScore.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          leadId: 'lead-1',
          fitScore: 75,
          engagementScore: 60,
          intentScore: 80,
          overallScore: expect.any(Number),
        }),
      });
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: expect.objectContaining({ score: expect.any(Number) }),
      });
    });

    it('should clamp scores to 0-100 range', async () => {
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({
          fitScore: 150,
          engagementScore: -20,
          intentScore: 90,
          factors: {},
        }),
      });
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-1' });

      await service.scoreLead('lead-1');

      const callData = mockPrisma.leadScore.create.mock.calls[0][0].data;
      expect(callData.fitScore).toBe(100); // clamped from 150
      expect(callData.engagementScore).toBe(0); // clamped from -20
      expect(callData.intentScore).toBe(90);
    });

    it('should compute overallScore as weighted average', async () => {
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({
          fitScore: 80,
          engagementScore: 60,
          intentScore: 40,
          factors: {},
        }),
      });
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-1' });

      await service.scoreLead('lead-1');

      const callData = mockPrisma.leadScore.create.mock.calls[0][0].data;
      // 80*0.4 + 60*0.3 + 40*0.3 = 32 + 18 + 12 = 62
      expect(callData.overallScore).toBe(62);
    });

    it('should throw when lead not found', async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.scoreLead('missing')).rejects.toThrow('Lead missing not found');
    });
  });

  describe('scoreLead (rule-based fallback)', () => {
    it('should fall back to rule-based scoring when LLM fails', async () => {
      mockLlm.complete.mockRejectedValue(new Error('LLM unavailable'));
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-rb-1' });

      const result = await service.scoreLead('lead-1');

      expect(result).toBeDefined();
      expect(mockPrisma.leadScore.create).toHaveBeenCalled();
      // Verify rule-based scoring was used (method field in factors)
      const callData = mockPrisma.leadScore.create.mock.calls[0][0].data;
      expect(callData.factors.method).toBe('rule-based');
    });

    it('should apply fit signals correctly in rule-based scoring', async () => {
      mockLlm.complete.mockRejectedValue(new Error('fail'));
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-1' });

      // Lead has company, title, linkedinUrl, website → fitScore should be 50+10+10+10+5=85
      await service.scoreLead('lead-1');

      const callData = mockPrisma.leadScore.create.mock.calls[0][0].data;
      expect(callData.fitScore).toBe(85);
    });

    it('should apply intent signals for different sources', async () => {
      mockLlm.complete.mockRejectedValue(new Error('fail'));
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-1' });

      // Override lead source to demo_request
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        source: 'demo_request',
        company: null,
        title: null,
        linkedinUrl: null,
        website: null,
        activities: [],
        lastContactedAt: null,
      });

      await service.scoreLead('lead-1');

      const callData = mockPrisma.leadScore.create.mock.calls[0][0].data;
      // intentScore starts at 30 + 30 (demo_request) = 60
      expect(callData.intentScore).toBe(60);
    });

    it('should cap engagement score at 100 for many activities', async () => {
      mockLlm.complete.mockRejectedValue(new Error('fail'));
      mockPrisma.leadScore.create.mockResolvedValue({ id: 'score-1' });

      // 10 activities → 20 + min(50, 100) = 70
      mockPrisma.lead.findUnique.mockResolvedValue({
        ...mockLead,
        activities: Array(10).fill({ type: 'note', description: 'x' }),
        lastContactedAt: null,
        company: null,
        title: null,
        linkedinUrl: null,
        website: null,
      });

      await service.scoreLead('lead-1');

      const callData = mockPrisma.leadScore.create.mock.calls[0][0].data;
      expect(callData.engagementScore).toBe(70);
    });
  });
});
