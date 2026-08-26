import { LeadService } from './lead.service';
import { NotFoundException } from '@nestjs/common';

// Mock PrismaService
const mockPrisma = {
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createMany: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  leadActivity: {
    create: jest.fn(),
  },
} as any;

// Mock LeadScoringService
const mockScoring = {
  scoreLead: jest.fn(),
} as any;

describe('LeadService', () => {
  let service: LeadService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadService(mockPrisma, mockScoring);
  });

  describe('create', () => {
    it('should create a lead and trigger auto-scoring', async () => {
      const leadData = { id: 'lead-1', name: 'John Doe', founderId: 'f1' };
      mockPrisma.lead.create.mockResolvedValue(leadData);
      mockScoring.scoreLead.mockResolvedValue({ overallScore: 72 });

      const result = await service.create('f1', { name: 'John Doe' } as any);

      expect(result).toEqual(leadData);
      expect(mockPrisma.lead.create).toHaveBeenCalledWith({
        data: { name: 'John Doe', founder: { connect: { id: 'f1' } } },
      });
      // Auto-scoring is fire-and-forget (called async, not awaited)
      expect(mockScoring.scoreLead).toHaveBeenCalledWith('lead-1');
    });

    it('should not throw when auto-scoring fails', async () => {
      mockPrisma.lead.create.mockResolvedValue({ id: 'lead-2', name: 'Jane' });
      mockScoring.scoreLead.mockRejectedValue(new Error('LLM down'));

      // Should not throw — scoring failure is caught
      const result = await service.create('f1', { name: 'Jane' } as any);
      expect(result.id).toBe('lead-2');
    });
  });

  describe('findAll', () => {
    it('should return all leads for a founder', async () => {
      const leads = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
      mockPrisma.lead.findMany.mockResolvedValue(leads);

      const result = await service.findAll('f1');
      expect(result).toEqual(leads);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ founderId: 'f1' }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      await service.findAll('f1', { status: 'QUALIFIED' as any });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'QUALIFIED' }),
        }),
      );
    });

    it('should filter by score range', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      await service.findAll('f1', { minScore: 50, maxScore: 90 });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            score: { gte: 50, lte: 90 },
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([]);
      await service.findAll('f1', { search: 'acme' });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.objectContaining({ contains: 'acme' }) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a lead with activities and score history', async () => {
      const lead = { id: 'lead-1', name: 'John', activities: [], scoreHistory: [] };
      mockPrisma.lead.findFirst.mockResolvedValue(lead);

      const result = await service.findOne('f1', 'lead-1');
      expect(result).toEqual(lead);
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(service.findOne('f1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.lead.update.mockResolvedValue({ id: 'lead-1', name: 'Updated' });

      const result = await service.update('f1', 'lead-1', { name: 'Updated' } as any);
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(service.update('f1', 'missing', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.lead.delete.mockResolvedValue({ id: 'lead-1' });

      await service.delete('f1', 'lead-1');
      expect(mockPrisma.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(service.delete('f1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('scoreLead', () => {
    it('should delegate to LeadScoringService', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
      mockScoring.scoreLead.mockResolvedValue({ overallScore: 80 });

      const result = await service.scoreLead('f1', 'lead-1');
      expect(result.overallScore).toBe(80);
      expect(mockScoring.scoreLead).toHaveBeenCalledWith('lead-1');
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(service.scoreLead('f1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addActivity', () => {
    it('should create an activity', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
      const activity = { id: 'act-1', type: 'note', description: 'Test note' };
      mockPrisma.leadActivity.create.mockResolvedValue(activity);

      const result = await service.addActivity('f1', 'lead-1', 'note', 'Test note');
      expect(result).toEqual(activity);
    });

    it('should update lastContactedAt for contact activities', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.leadActivity.create.mockResolvedValue({ id: 'act-1' });
      mockPrisma.lead.update.mockResolvedValue({});

      await service.addActivity('f1', 'lead-1', 'email_sent', 'Sent intro email');
      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { lastContactedAt: expect.any(Date) },
      });
    });

    it('should NOT update lastContactedAt for non-contact activities', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
      mockPrisma.leadActivity.create.mockResolvedValue({ id: 'act-1' });

      await service.addActivity('f1', 'lead-1', 'note', 'Internal note');
      expect(mockPrisma.lead.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);
      await expect(service.addActivity('f1', 'missing', 'note', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPipelineStats', () => {
    it('should return pipeline stats with counts and percentages', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([
        { status: 'NEW', _count: { id: 10 }, _avg: { score: 45 } },
        { status: 'QUALIFIED', _count: { id: 5 }, _avg: { score: 72 } },
      ]);
      mockPrisma.lead.aggregate.mockResolvedValue({ _avg: { score: 55 }, _count: { id: 15 } });
      mockPrisma.lead.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(2); // closed_won

      const result = await service.getPipelineStats('f1');

      expect(result.total).toBe(15);
      expect(result.pipeline).toBeDefined();
      expect(Array.isArray(result.pipeline)).toBe(true);
      expect(result.conversionRate).toBe(13); // 2/15 = 13%
    });

    it('should handle zero leads', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([]);
      mockPrisma.lead.aggregate.mockResolvedValue({ _avg: { score: null }, _count: { id: 0 } });
      mockPrisma.lead.count.mockResolvedValue(0);

      const result = await service.getPipelineStats('f1');
      expect(result.total).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  describe('suggestNextAction', () => {
    it('should suggest intro email for new uncontacted leads', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1', name: 'John', status: 'NEW', score: 50,
        lastContactedAt: null, activities: [],
      });

      const result = await service.suggestNextAction('f1', 'lead-1');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s: any) => s.action.includes('intro email'))).toBe(true);
    });

    it('should suggest follow-up for contacted leads', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1', name: 'John', status: 'CONTACTED', score: 60,
        lastContactedAt: new Date(), activities: [{ id: '1' }],
      });

      const result = await service.suggestNextAction('f1', 'lead-1');
      expect(result.suggestions.some((s: any) => s.action.includes('Follow up'))).toBe(true);
    });

    it('should prioritize high-scoring leads', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1', name: 'John', status: 'NEW', score: 85,
        lastContactedAt: new Date(), activities: [{ id: '1' }],
      });

      const result = await service.suggestNextAction('f1', 'lead-1');
      expect(result.suggestions.some((s: any) => s.action.includes('Prioritize'))).toBe(true);
    });
  });

  describe('importLeads', () => {
    it('should bulk import leads and trigger scoring', async () => {
      mockPrisma.lead.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.lead.findMany.mockResolvedValue([
        { id: 'l1' }, { id: 'l2' }, { id: 'l3' },
      ]);
      mockScoring.scoreLead.mockResolvedValue({});

      const result = await service.importLeads('f1', [
        { name: 'A', email: 'a@test.com' },
        { name: 'B', email: 'b@test.com' },
        { name: 'C', email: 'c@test.com' },
      ]);

      expect(result.imported).toBe(3);
      expect(mockScoring.scoreLead).toHaveBeenCalledTimes(3);
    });
  });
});
