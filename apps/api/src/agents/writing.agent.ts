import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class WritingAgent implements SpecialistAgent {
  name = 'Writing Agent';
  layer = 'MARKETING';
  private readonly logger = new Logger(WritingAgent.name);

  capabilities = [
    { name: 'Blog Posts', description: 'Write SEO-optimized blog posts and articles', examples: ['Write a blog post about AI trends', 'Draft an article on startup growth'] },
    { name: 'Email Campaigns', description: 'Create email marketing sequences', examples: ['Write a cold email sequence', 'Draft a newsletter'] },
    { name: 'Social Media Copy', description: 'Create engaging social media posts', examples: ['Write 10 LinkedIn posts about our product', 'Draft tweet threads'] },
    { name: 'Landing Page Copy', description: 'Write conversion-optimized landing page content', examples: ['Write landing page copy for our SaaS', 'Create hero section copy'] },
    { name: 'Product Descriptions', description: 'Write compelling product descriptions', examples: ['Write product descriptions for our pricing page', 'Create feature descriptions'] },
    { name: 'Business Documents', description: 'Draft business plans, proposals, pitch decks', examples: ['Write an investor update', 'Draft a partnership proposal'] },
  ];

  constructor(private llm: LLMService) {}

  canHandle(intent: string, params: Record<string, string>): boolean {
    const keywords = ['write', 'draft', 'blog', 'article', 'copy', 'content', 'email copy', 'newsletter', 'landing page', 'description', 'proposal', 'investor update', 'pitch', 'business plan', 'social media post', 'linkedin post', 'tweet'];
    return keywords.some((k) => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, intent: string, params: Record<string, string>, message: string): Promise<AgentResult> {
    const type = this.detectWritingType(message);

    const systemPrompt = `You are an expert content writer for startups and small businesses.
You specialize in: ${type}

Write in a clear, engaging, professional tone.
Structure your output with proper headings, bullet points, and sections.
Output valid JSON:
{
  "content": "<the written content in markdown>",
  "title": "<a compelling title>",
  "wordCount": <approximate word count>,
  "seoKeywords": ["<keyword1>", "<keyword2>"],
  "suggestions": ["<improvement suggestion>"]
}`;

    const response = await this.llm.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.7 });

    try {
      const parsed = JSON.parse(response.content);
      return {
        agentName: this.name,
        response: `## ${parsed.title || type}\n\n${parsed.content}\n\n---\n*${parsed.wordCount || 'N/A'} words • SEO keywords: ${(parsed.seoKeywords || []).join(', ')}*`,
        suggestions: parsed.suggestions || [],
        confidence: 0.85,
      };
    } catch {
      return {
        agentName: this.name,
        response: response.content,
        confidence: 0.7,
      };
    }
  }

  private detectWritingType(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('blog') || msg.includes('article')) return 'Blog Posts & Articles';
    if (msg.includes('email') || msg.includes('newsletter')) return 'Email Marketing';
    if (msg.includes('social') || msg.includes('linkedin') || msg.includes('tweet')) return 'Social Media';
    if (msg.includes('landing') || msg.includes('hero')) return 'Landing Pages';
    if (msg.includes('proposal') || msg.includes('investor') || msg.includes('pitch')) return 'Business Documents';
    if (msg.includes('product') || msg.includes('description')) return 'Product Descriptions';
    return 'General Writing';
  }
}
