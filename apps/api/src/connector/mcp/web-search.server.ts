import { BaseMCPServer, MCPTool, MCPToolCall, MCPToolResult } from './mcp-server.interface.js';

/**
 * Web Search MCP Server
 * Provides web search capabilities for market research, competitor scanning, and trend monitoring.
 * Uses a configurable search API (SerpAPI, Google Custom Search, or similar).
 */
export class WebSearchMCPServer extends BaseMCPServer {
  readonly name = 'web-search';
  readonly displayName = 'Web Search';
  readonly description = 'Web search for market research, competitor scanning, and trend monitoring';

  private apiKey: string = '';
  private searchEngine: 'serpapi' | 'google' | 'bing' = 'serpapi';

  protected async authenticate(): Promise<void> {
    this.apiKey = this.credentials['apiKey'] || process.env.SEARCH_API_KEY || '';
    this.searchEngine = (this.credentials['searchEngine'] as any) || 'serpapi';
    this.authenticated = !!this.apiKey;
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'web_search',
        description: 'Search the web for information on any topic. Returns search results with titles, URLs, and snippets.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            numResults: { type: 'number', description: 'Number of results (1-10)', default: 5 },
            language: { type: 'string', description: 'Search language', default: 'en' },
            country: { type: 'string', description: 'Country code for search', default: 'us' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_news',
        description: 'Search for recent news articles on a topic.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'News search query' },
            numResults: { type: 'number', description: 'Number of results (1-10)', default: 5 },
            timeRange: { type: 'string', description: 'Time range: day, week, month, year', default: 'week' },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_competitor',
        description: 'Search for information about a specific competitor or company.',
        inputSchema: {
          type: 'object',
          properties: {
            companyName: { type: 'string', description: 'Company or competitor name' },
            aspects: { type: 'string', description: 'Specific aspects to search for (pricing, product, hiring)', default: 'general' },
          },
          required: ['companyName'],
        },
      },
      {
        name: 'search_trends',
        description: 'Search for trending topics and search interest data.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Topic to check trends for' },
            timeframe: { type: 'string', description: 'Timeframe: 7d, 30d, 90d', default: '30d' },
          },
          required: ['topic'],
        },
      },
    ];
  }

  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    try {
      switch (call.name) {
        case 'web_search':
          return await this.webSearch(call.arguments);
        case 'search_news':
          return await this.searchNews(call.arguments);
        case 'search_competitor':
          return await this.searchCompetitor(call.arguments);
        case 'search_trends':
          return await this.searchTrends(call.arguments);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${call.name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Search error: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async webSearch(args: Record<string, unknown>): Promise<MCPToolResult> {
    const query = args.query as string;
    const numResults = (args.numResults as number) || 5;

    // SerpAPI implementation
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${numResults}&api_key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    const results = (data.organic_results || [])
      .slice(0, numResults)
      .map((r: any, i: number) =>
        `${i + 1}. ${r.title}\n   URL: ${r.link}\n   ${r.snippet || ''}`,
      )
      .join('\n\n');

    return {
      content: [{ type: 'text', text: results || 'No results found.' }],
    };
  }

  private async searchNews(args: Record<string, unknown>): Promise<MCPToolResult> {
    const query = args.query as string;
    const numResults = (args.numResults as number) || 5;

    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&tbm=nws&num=${numResults}&api_key=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    const results = (data.news_results || [])
      .slice(0, numResults)
      .map((r: any, i: number) =>
        `${i + 1}. ${r.title}\n   Source: ${r.source} | ${r.date}\n   ${r.snippet || ''}\n   URL: ${r.link}`,
      )
      .join('\n\n');

    return {
      content: [{ type: 'text', text: results || 'No news results found.' }],
    };
  }

  private async searchCompetitor(args: Record<string, unknown>): Promise<MCPToolResult> {
    const company = args.companyName as string;
    const aspects = (args.aspects as string) || 'general';

    const queries = [
      `${company} pricing ${aspects}`,
      `${company} product launch 2025`,
      `${company} reviews`,
    ];

    const allResults: string[] = [];
    for (const q of queries.slice(0, 2)) {
      const result = await this.webSearch({ query: q, numResults: 3 });
      allResults.push(result.content[0].text || '');
    }

    return {
      content: [{ type: 'text', text: allResults.join('\n---\n') }],
    };
  }

  private async searchTrends(args: Record<string, unknown>): Promise<MCPToolResult> {
    const topic = args.topic as string;

    // Search for trend data
    const result = await this.webSearch({
      query: `${topic} trends search interest`,
      numResults: 5,
    });

    return result;
  }
}
