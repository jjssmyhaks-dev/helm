import { EmailService } from './email.service';
import { NotFoundException } from '@nestjs/common';

// Mock PrismaService
const mockPrisma = {
  emailDraft: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  emailTemplate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  emailSent: {
    create: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  founder: {
    findUnique: jest.fn(),
  },
} as any;

// Mock EmailRagService
const mockRag = {
  retrieveRelevant: jest.fn(),
  indexSentEmail: jest.fn(),
} as any;

// Mock LLMService
const mockLlm = {
  complete: jest.fn(),
} as any;

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailService(mockPrisma, mockRag, mockLlm);

    mockPrisma.founder.findUnique.mockResolvedValue({ id: 'f1', businessName: 'Helm', email: 'founder@helm.com' });
    mockRag.retrieveRelevant.mockResolvedValue([]);
  });

  describe('draftEmail', () => {
    it('should create a draft email from LLM response', async () => {
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({
          subject: 'Partnership Opportunity',
          body: 'Hi there,\n\nI would love to explore a partnership.',
          summary: 'Partnership outreach email',
          suggestions: ['Add a specific metric'],
        }),
      });
      const draft = { id: 'draft-1', subject: 'Partnership Opportunity', status: 'DRAFT' };
      mockPrisma.emailDraft.create.mockResolvedValue(draft);

      const result = await service.draftEmail('f1', 'PARTNER', {
        to: 'partner@company.com',
        keyPoints: ['Partnership', 'Integration'],
      });

      expect(result.draft).toEqual(draft);
      expect(result.summary).toBe('Partnership outreach email');
      expect(result.suggestions).toContain('Add a specific metric');
      expect(mockPrisma.emailDraft.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            founderId: 'f1',
            category: 'PARTNER',
            status: 'DRAFT',
          }),
        }),
      );
    });

    it('should use default tonality based on category', async () => {
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({ subject: 'Test', body: 'Body', summary: 'S' }),
      });
      mockPrisma.emailDraft.create.mockResolvedValue({ id: 'd1' });

      await service.draftEmail('f1', 'VENDOR', { to: 'v@x.com' });

      const callData = mockPrisma.emailDraft.create.mock.calls[0][0].data;
      expect(callData.tonality).toBe('assertive'); // vendor default
    });

    it('should use custom tonality when provided', async () => {
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({ subject: 'Test', body: 'Body', summary: 'S' }),
      });
      mockPrisma.emailDraft.create.mockResolvedValue({ id: 'd1' });

      await service.draftEmail('f1', 'LEAD', { tonality: 'friendly' });

      const callData = mockPrisma.emailDraft.create.mock.calls[0][0].data;
      expect(callData.tonality).toBe('friendly');
    });

    it('should fall back to raw response when JSON parsing fails', async () => {
      mockLlm.complete.mockResolvedValue({ content: 'Just plain text response' });
      mockPrisma.emailDraft.create.mockResolvedValue({ id: 'd-fallback' });

      const result = await service.draftEmail('f1', 'GENERAL', {});

      expect(result.draft.id).toBe('d-fallback');
      expect(result.summary).toBe('Draft created from raw response');
      expect(result.suggestions).toEqual([]);
    });

    it('should pass RAG-retrieved examples to the LLM prompt', async () => {
      mockRag.retrieveRelevant.mockResolvedValue([
        'Subject: Past email\nBody: Hello...',
      ]);
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify({ subject: 'Test', body: 'Body', summary: 'S' }),
      });
      mockPrisma.emailDraft.create.mockResolvedValue({ id: 'd1' });

      await service.draftEmail('f1', 'LEAD', { keyPoints: ['follow up'] });

      // Verify RAG was called
      expect(mockRag.retrieveRelevant).toHaveBeenCalledWith(
        'f1',
        'LEAD',
        expect.any(String),
      );
    });
  });

  describe('approveDraft', () => {
    it('should approve a draft', async () => {
      mockPrisma.emailDraft.findUnique.mockResolvedValue({ id: 'd1', status: 'DRAFT' });
      mockPrisma.emailDraft.update.mockResolvedValue({ id: 'd1', status: 'APPROVED' });

      const result = await service.approveDraft('d1');
      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.emailDraft.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: 'APPROVED' },
      });
    });

    it('should throw NotFoundException for missing draft', async () => {
      mockPrisma.emailDraft.findUnique.mockResolvedValue(null);
      await expect(service.approveDraft('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendEmail', () => {
    it('should send an approved draft', async () => {
      mockPrisma.emailDraft.findUnique.mockResolvedValue({
        id: 'd1',
        status: 'APPROVED',
        founderId: 'f1',
        to: 'recipient@test.com',
        subject: 'Hello',
        body: 'Body text',
        category: 'LEAD',
        tonality: 'professional',
        founder: { email: 'founder@helm.com' },
      });
      mockPrisma.emailSent.create.mockResolvedValue({ id: 'sent-1' });
      mockPrisma.emailDraft.update.mockResolvedValue({});
      mockRag.indexSentEmail.mockResolvedValue({});

      const result = await service.sendEmail('d1');

      expect(result.id).toBe('sent-1');
      expect(mockPrisma.emailDraft.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: 'SENT', sentAt: expect.any(Date) },
      });
      expect(mockRag.indexSentEmail).toHaveBeenCalledWith(
        'f1', 'LEAD', 'Hello', 'Body text', 'professional',
      );
    });

    it('should throw when draft is not approved', async () => {
      mockPrisma.emailDraft.findUnique.mockResolvedValue({
        id: 'd1', status: 'DRAFT', founder: { email: 'x' },
      });

      await expect(service.sendEmail('d1')).rejects.toThrow('Draft must be approved');
    });

    it('should throw NotFoundException for missing draft', async () => {
      mockPrisma.emailDraft.findUnique.mockResolvedValue(null);
      await expect(service.sendEmail('missing')).rejects.toThrow(NotFoundException);
    });

    it('should mark draft as FAILED on send error', async () => {
      mockPrisma.emailDraft.findUnique.mockResolvedValue({
        id: 'd1', status: 'APPROVED', founder: { email: 'x' },
      });
      mockPrisma.emailSent.create.mockRejectedValue(new Error('Send failed'));
      mockPrisma.emailDraft.update.mockResolvedValue({});

      await expect(service.sendEmail('d1')).rejects.toThrow('Failed to send email');
      expect(mockPrisma.emailDraft.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: { status: 'FAILED' },
      });
    });
  });

  describe('getTemplates', () => {
    it('should return all templates for a founder', async () => {
      const templates = [{ id: 't1', name: 'Follow Up' }];
      mockPrisma.emailTemplate.findMany.mockResolvedValue(templates);

      const result = await service.getTemplates('f1');
      expect(result).toEqual(templates);
    });

    it('should filter by category', async () => {
      mockPrisma.emailTemplate.findMany.mockResolvedValue([]);
      await service.getTemplates('f1', 'VC');

      expect(mockPrisma.emailTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'VC' }),
        }),
      );
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const template = { id: 't1', name: 'My Template', category: 'LEAD' };
      mockPrisma.emailTemplate.create.mockResolvedValue(template);

      const result = await service.createTemplate('f1', {
        name: 'My Template',
        category: 'LEAD' as any,
        subject: 'Hello',
        body: 'Body',
        tonality: 'professional',
      });
      expect(result).toEqual(template);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete an owned template', async () => {
      mockPrisma.emailTemplate.findFirst.mockResolvedValue({ id: 't1', founderId: 'f1' });
      mockPrisma.emailTemplate.delete.mockResolvedValue({});

      await service.deleteTemplate('f1', 't1');
      expect(mockPrisma.emailTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    it('should throw NotFoundException for missing template', async () => {
      mockPrisma.emailTemplate.findFirst.mockResolvedValue(null);
      await expect(service.deleteTemplate('f1', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return stats by category and status', async () => {
      mockPrisma.emailSent.groupBy.mockResolvedValue([
        { category: 'LEAD', _count: { id: 5 } },
        { category: 'VC', _count: { id: 3 } },
      ]);
      mockPrisma.emailDraft.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { id: 2 } },
        { status: 'SENT', _count: { id: 8 } },
      ]);

      const result = await service.getStats('f1');
      expect(result.totalSent).toBe(8);
      expect(result.totalDrafts).toBe(10);
      expect(result.sentByCategory).toHaveLength(2);
    });
  });

  describe('getDrafts', () => {
    it('should return drafts for a founder', async () => {
      mockPrisma.emailDraft.findMany.mockResolvedValue([{ id: 'd1' }]);
      const result = await service.getDrafts('f1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getSentEmails', () => {
    it('should return sent emails', async () => {
      mockPrisma.emailSent.findMany.mockResolvedValue([{ id: 's1' }]);
      const result = await service.getSentEmails('f1');
      expect(result).toHaveLength(1);
    });
  });
});
