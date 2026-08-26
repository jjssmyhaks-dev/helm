import { EmailRagService } from './email-rag.service';

// Mock PrismaService
const mockPrisma = {
  emailTemplate: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as any;

describe('EmailRagService', () => {
  let service: EmailRagService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailRagService(mockPrisma);
  });

  describe('retrieveRelevant', () => {
    it('should return system templates when no founder templates exist', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([]);

      const result = await service.retrieveRelevant('f1', 'LEAD', 'follow up meeting');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('Subject:');
      expect(result[0]).toContain('Tonality:');
      expect(result[0]).toContain('Body:');
    });

    it('should return system templates for each category', async () => {
      const categories = ['LEAD', 'VENDOR', 'PARTNER', 'VC', 'CUSTOMER', 'GENERAL'] as const;

      for (const cat of categories) {
        mockPrisma.emailTemplate.findMany.mockResolvedValue([]);
        const result = await service.retrieveRelevant('f1', cat, 'test');
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('should retrieve founder templates sorted by relevance', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([
        {
          id: 't1', subject: 'Follow up on demo', body: 'Thanks for the demo session',
          tonality: 'professional', usageCount: 5,
        },
        {
          id: 't2', subject: 'Quarterly update', body: 'Here are our Q3 metrics',
          tonality: 'concise', usageCount: 10,
        },
        {
          id: 't3', subject: 'Demo follow-up call', body: 'Let us schedule a demo call',
          tonality: 'friendly', usageCount: 2,
        },
      ]);
      mockPrisma.emailTemplate.update.mockResolvedValue({});

      const result = await service.retrieveRelevant('f1', 'LEAD', 'follow up demo call');

      // Should return formatted template strings
      expect(result.length).toBeGreaterThan(0);
      // The most relevant template (matching "follow", "demo", "call") should be included
      expect(result.some((r) => r.includes('Subject:'))).toBe(true);
    });

    it('should increment usage count for retrieved templates', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([
        {
          id: 't1', subject: 'Follow up', body: 'Hello',
          tonality: 'professional', usageCount: 0,
        },
      ]);
      mockPrisma.emailTemplate.update.mockResolvedValue({});

      await service.retrieveRelevant('f1', 'LEAD', 'follow up');

      expect(mockPrisma.emailTemplate.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { usageCount: { increment: 1 } },
      });
    });

    it('should fall back to system templates on Prisma error', async () => {
      mockPrisma.emailTemplate.findMany.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.retrieveRelevant('f1', 'VC', 'update metrics');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('Subject:');
    });

    it('should respect topK parameter', async () => {
      const templates = Array.from({ length: 10 }, (_, i) => ({
        id: `t${i}`, subject: `Email ${i}`, body: `Body ${i}`,
        tonality: 'professional', usageCount: i,
      }));
      mockPrisma.emailTemplate.findMany.mockResolvedValue(templates);
      mockPrisma.emailTemplate.update.mockResolvedValue({});

      const result = await service.retrieveRelevant('f1', 'LEAD', 'test', 2);

      // Should return at most topK templates
      expect(result.length).toBeLessThanOrEqual(4); // topK + mostUsed fallback
    });
  });

  describe('indexSentEmail', () => {
    it('should create a template from a sent email', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue({ id: 'new-t' });

      await service.indexSentEmail('f1', 'LEAD', 'Follow up', 'Hello there', 'professional');

      expect(mockPrisma.emailTemplate.create).toHaveBeenCalledWith({
        data: {
          founderId: 'f1',
          name: 'Auto: Follow up',
          category: 'LEAD',
          subject: 'Follow up',
          body: 'Hello there',
          tonality: 'professional',
          tags: ['auto-generated'],
        },
      });
    });

    it('should truncate long subjects in template name', async () => {
      mockPrisma.emailTemplate.create.mockResolvedValue({});

      const longSubject = 'A'.repeat(100);
      await service.indexSentEmail('f1', 'VC', longSubject, 'Body', 'concise');

      const callData = mockPrisma.emailTemplate.create.mock.calls[0][0].data;
      expect(callData.name.length).toBeLessThanOrEqual(56); // "Auto: " (6) + 50 chars
    });
  });

  describe('calculateRelevance (private, tested via retrieveRelevant)', () => {
    it('should rank templates with matching words higher', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([
        {
          id: 't1', subject: 'Meeting schedule', body: 'Let us schedule a meeting',
          tonality: 'friendly', usageCount: 0,
        },
        {
          id: 't2', subject: 'Invoice attached', body: 'Please find the invoice',
          tonality: 'formal', usageCount: 0,
        },
      ]);
      mockPrisma.emailTemplate.update.mockResolvedValue({});

      const result = await service.retrieveRelevant('f1', 'LEAD', 'schedule meeting call');

      // t1 should be retrieved (matches "schedule", "meeting")
      expect(result.some((r) => r.includes('Meeting schedule') || r.includes('schedule a meeting'))).toBe(true);
    });

    it('should handle empty context gracefully', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([
        { id: 't1', subject: 'Test', body: 'Body', tonality: 'professional', usageCount: 1 },
      ]);
      mockPrisma.emailTemplate.update.mockResolvedValue({});

      const result = await service.retrieveRelevant('f1', 'LEAD', '');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
