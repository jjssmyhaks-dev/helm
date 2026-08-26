import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentToolConnectorService } from '../connector/agent-tool-connector.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class SeoAgent implements SpecialistAgent {
  name = 'SEO Agent';
  layer = 'RESEARCH';
  private readonly logger = new Logger(SeoAgent.name);

  capabilities = [
    { name: 'Keyword Research', description: 'Find high-volume, low-competition keywords', examples: ['Research keywords for my blog'] },
    { name: 'Content Strategy', description: 'Plan SEO content calendar', examples: ['Create a 3-month content plan'] },
    { name: 'On-Page SEO', description: 'Optimize titles, meta descriptions, headers', examples: ['Optimize this blog post for SEO'] },
    { name: 'Technical SEO', description: 'Site speed, structure, schema markup', examples: ['Audit my site technical SEO'] },
    { name: 'Competitor SEO', description: 'Analyze competitor rankings', examples: ['What keywords does competitor X rank for?'] },
  ];

  constructor(private llm: LLMService, private tools: AgentToolConnectorService) {}

  canHandle(intent: string): boolean {
    return ['seo', 'keyword', 'search engine', 'ranking', 'serp', 'backlink', 'on-page', 'technical seo', 'content strategy', 'meta description', 'title tag'].some(k => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, _intent: string, _params: Record<string, string>, message: string): Promise<AgentResult> {
    const toolCalls: AgentResult['toolCalls'] = [];
    try {
      const result = await this.tools.executeTool(founderId, 'GOOGLESEARCH_SEARCH', { query: message, num: 10 });
      if (result.success) toolCalls?.push({ tool: 'GOOGLESEARCH_SEARCH', input: { query: message }, output: result.result });
    } catch { /* not connected */ }

    const response = await this.llm.complete([
      { role: 'system', content: 'You are an SEO expert. Provide keyword research, content plans, and technical SEO recommendations. Output JSON: {"analysis":"<markdown>","keywords":[{"keyword":"","volume":"","difficulty":"","intent":""}],"contentPlan":[{"title":"","targetKeyword":"","wordCount":""}],"recommendations":[""]}' },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.5 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 🔎 SEO Analysis\n\n${parsed.analysis}\n\n`;
      if (parsed.keywords?.length > 0) { md += `### Keywords\n`; for (const kw of parsed.keywords.slice(0, 15)) { md += `- **${kw.keyword}** — Vol: ${kw.volume} | Diff: ${kw.difficulty} | Intent: ${kw.intent}\n`; } md += '\n'; }
      if (parsed.contentPlan?.length > 0) { md += `### Content Plan\n`; for (const c of parsed.contentPlan) { md += `- **${c.title}** — Target: ${c.targetKeyword} (${c.wordCount} words)\n`; } }
      return { agentName: this.name, response: md, toolCalls, suggestions: parsed.recommendations || [], confidence: 0.85 };
    } catch { return { agentName: this.name, response: response.content, toolCalls, confidence: 0.7 }; }
  }
}
