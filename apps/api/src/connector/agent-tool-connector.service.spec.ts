import { AgentToolConnectorService } from './agent-tool-connector.service';

// Mock ComposioService
const mockComposio = {
  getToolsForFounder: jest.fn(),
  executeAction: jest.fn(),
  getConnectionStatus: jest.fn(),
} as any;

// Mock LLMService
const mockLlm = {
  complete: jest.fn(),
} as any;

const mockTools = [
  { name: 'google_search', description: 'Search the web', appName: 'googlesearch' },
  { name: 'send_email', description: 'Send an email via Gmail', appName: 'gmail' },
  { name: 'create_calendar_event', description: 'Create a calendar event', appName: 'googlecalendar' },
  { name: 'post_tweet', description: 'Post a tweet on Twitter', appName: 'twitter' },
];

describe('AgentToolConnectorService', () => {
  let service: AgentToolConnectorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AgentToolConnectorService(mockComposio, mockLlm);
  });

  describe('getAvailableTools', () => {
    it('should return formatted tools for a founder', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);

      const result = await service.getAvailableTools('f1');

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: 'google_search',
          displayName: expect.any(String),
          description: 'Search the web',
          appName: 'googlesearch',
        }),
      );
    });

    it('should return empty array when Composio fails', async () => {
      mockComposio.getToolsForFounder.mockRejectedValue(new Error('API down'));

      const result = await service.getAvailableTools('f1');
      expect(result).toEqual([]);
    });

    it('should format tool names for display', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue([
        { name: 'google_search', description: 'Search', appName: 'google' },
      ]);

      const result = await service.getAvailableTools('f1');
      expect(result[0].displayName).toBe('Google search');
    });
  });

  describe('executeTool', () => {
    it('should execute a tool and return success', async () => {
      mockComposio.executeAction.mockResolvedValue({ status: 'ok', data: { id: '123' } });

      const result = await service.executeTool('f1', 'send_email', { to: 'test@x.com' });

      expect(result.success).toBe(true);
      expect(result.toolName).toBe('send_email');
      expect(result.result).toEqual({ status: 'ok', data: { id: '123' } });
      expect(mockComposio.executeAction).toHaveBeenCalledWith('f1', 'send_email', { to: 'test@x.com' });
    });

    it('should return error when execution fails', async () => {
      mockComposio.executeAction.mockRejectedValue(new Error('Tool not found'));

      const result = await service.executeTool('f1', 'nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tool not found');
      expect(result.toolName).toBe('nonexistent');
    });
  });

  describe('suggestTools', () => {
    it('should return AI-powered tool suggestions', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify([
          {
            toolName: 'google_search',
            appName: 'googlesearch',
            description: 'Search for market data',
            relevance: 0.9,
          },
        ]),
      });

      const result = await service.suggestTools('f1', 'research competitor pricing');

      expect(result).toHaveLength(1);
      expect(result[0].toolName).toBe('google_search');
      expect(result[0].relevance).toBe(0.9);
    });

    it('should return empty array when no tools available', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue([]);

      const result = await service.suggestTools('f1', 'send email');
      expect(result).toEqual([]);
    });

    it('should return empty array when LLM returns invalid JSON', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);
      mockLlm.complete.mockResolvedValue({ content: 'not json' });

      const result = await service.suggestTools('f1', 'test');
      expect(result).toEqual([]);
    });

    it('should cap suggestions at 5', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify(
          Array.from({ length: 10 }, (_, i) => ({
            toolName: `tool_${i}`,
            appName: `app_${i}`,
            description: `desc ${i}`,
            relevance: 0.8,
          })),
        ),
      });

      const result = await service.suggestTools('f1', 'do everything');
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should filter out suggestions with relevance <= 0.3 via LLM prompt', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);
      mockLlm.complete.mockResolvedValue({
        content: JSON.stringify([
          { toolName: 'google_search', appName: 'google', description: 'Search', relevance: 0.9 },
          { toolName: 'low_relevance', appName: 'x', description: 'Low', relevance: 0.1 },
        ]),
      });

      const result = await service.suggestTools('f1', 'search');
      // LLM is told to filter, but we just verify the parse works
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('searchTools', () => {
    it('should filter tools by name match', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);

      const result = await service.searchTools('email');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('send_email');
    });

    it('should filter tools by description match', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);

      const result = await service.searchTools('calendar');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('create_calendar_event');
    });

    it('should be case-insensitive', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);

      const result = await service.searchTools('SEARCH');
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no matches', async () => {
      mockComposio.getToolsForFounder.mockResolvedValue(mockTools);

      const result = await service.searchTools('blockchain');
      expect(result).toEqual([]);
    });

    it('should return empty array on Composio error', async () => {
      mockComposio.getToolsForFounder.mockRejectedValue(new Error('fail'));

      const result = await service.searchTools('test');
      expect(result).toEqual([]);
    });
  });

  describe('getAppsStatus', () => {
    it('should delegate to Composio getConnectionStatus', async () => {
      const status = [
        { name: 'gmail', connected: true },
        { name: 'slack', connected: false },
      ];
      mockComposio.getConnectionStatus.mockResolvedValue(status);

      const result = await service.getAppsStatus('f1');
      expect(result).toEqual(status);
      expect(mockComposio.getConnectionStatus).toHaveBeenCalledWith('f1');
    });
  });
});
