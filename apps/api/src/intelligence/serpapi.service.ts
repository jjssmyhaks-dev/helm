import { Injectable, Logger } from '@nestjs/common';

/**
 * SerpAPI service for real-time web search data.
 * Used by the competitor intelligence engine for live research.
 */
@Injectable()
export class SerpAPIService {
  private readonly logger = new Logger(SerpAPIService.name);
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SEARCH_API_KEY || '';
    this.logger.log(`SerpAPI: ${this.apiKey ? 'configured' : 'not configured'}`);
  }

  /**
   * Search Google for real-time results.
   */
  async search(
    query: string,
    options: { num?: number; location?: string; gl?: string; hl?: string } = {},
  ): Promise<{
    results: { title: string; link: string; snippet: string; position: number }[];
    relatedQuestions: { question: string; snippet: string; link: string }[];
    totalResults: string;
  }> {
    if (!this.apiKey) {
      return this.fallbackSearch(query);
    }

    const params = new URLSearchParams({
      q: query,
      api_key: this.apiKey,
      engine: 'google',
      num: String(options.num || 10),
      gl: options.gl || 'in',
      hl: options.hl || 'en',
    });

    if (options.location) {
      params.set('location', options.location);
    }

    try {
      const response = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!response.ok) throw new Error(`SerpAPI HTTP ${response.status}`);
      const data = await response.json();

      return {
        results: (data.organic_results || []).map((r: any, i: number) => ({
          title: r.title || '',
          link: r.link || '',
          snippet: r.snippet || '',
          position: r.position || i + 1,
        })),
        relatedQuestions: (data.related_questions || []).map((q: any) => ({
          question: q.question || '',
          snippet: q.snippet || '',
          link: q.link || '',
        })),
        totalResults: data.search_information?.total_results || '0',
      };
    } catch (err) {
      this.logger.error(`SerpAPI search failed: ${err}`);
      return this.fallbackSearch(query);
    }
  }

  /**
   * Search for news articles.
   */
  async searchNews(
    query: string,
    options: { num?: number; when?: string } = {},
  ): Promise<{ articles: { title: string; link: string; snippet: string; date: string; source: string }[] }> {
    if (!this.apiKey) {
      return { articles: [] };
    }

    const params = new URLSearchParams({
      q: query,
      api_key: this.apiKey,
      engine: 'google_news',
      num: String(options.num || 10),
    });

    try {
      const response = await fetch(`https://serpapi.com/search.json?${params}`);
      if (!response.ok) throw new Error(`SerpAPI HTTP ${response.status}`);
      const data = await response.json();

      return {
        articles: (data.news_results || []).map((a: any) => ({
          title: a.title || '',
          link: a.link || '',
          snippet: a.snippet || '',
          date: a.date || '',
          source: a.source || '',
        })),
      };
    } catch (err) {
      this.logger.error(`SerpAPI news search failed: ${err}`);
      return { articles: [] };
    }
  }

  /**
   * Search for specific competitor information.
   */
  async researchCompetitor(
    competitorName: string,
    industry: string,
  ): Promise<{
    searchResults: any[];
    newsResults: any[];
    pricingInfo: string[];
  }> {
    const [searchResults, newsResults, pricingSearch] = await Promise.all([
      this.search(`${competitorName} ${industry} product features pricing`, { num: 10 }),
      this.searchNews(`${competitorName} ${industry} latest news updates`, { num: 5 }),
      this.search(`${competitorName} pricing plans cost comparison`, { num: 5 }),
    ]);

    const pricingInfo = pricingSearch.results
      .filter((r) => r.snippet.toLowerCase().includes('price') || r.snippet.toLowerCase().includes('plan') || r.snippet.toLowerCase().includes('cost'))
      .map((r) => `${r.title}: ${r.snippet}`);

    return {
      searchResults: searchResults.results,
      newsResults: newsResults.articles,
      pricingInfo,
    };
  }

  /**
   * Search for market/industry trends.
   */
  async researchMarketTrends(
    industry: string,
    location: string = 'India',
  ): Promise<{
    trends: { title: string; snippet: string; source: string }[];
    news: { title: string; date: string; source: string }[];
  }> {
    const [trendSearch, newsSearch] = await Promise.all([
      this.search(`${industry} market trends ${location} 2025 2026`, { num: 10, location }),
      this.searchNews(`${industry} market news ${location}`, { num: 10 }),
    ]);

    return {
      trends: trendSearch.results.map((r) => ({
        title: r.title,
        snippet: r.snippet,
        source: r.link,
      })),
      news: newsSearch.articles.map((a) => ({
        title: a.title,
        date: a.date,
        source: a.source,
      })),
    };
  }

  /**
   * Fallback when SerpAPI is not configured.
   */
  private async fallbackSearch(query: string) {
    return {
      results: [{
        title: `[SerpAPI not configured] Search for: ${query}`,
        link: '',
        snippet: 'Set SEARCH_API_KEY environment variable to enable real web search data.',
        position: 1,
      }],
      relatedQuestions: [],
      totalResults: '0',
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
