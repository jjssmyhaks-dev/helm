import { Injectable } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentBase, AgentConfig } from './agent-base.js';

const CONFIG: AgentConfig = {
  name: 'Writing Agent',
  layer: 'MARKETING',
  intentKeywords: ['write', 'draft', 'blog', 'article', 'copy', 'content', 'newsletter', 'landing page', 'description', 'proposal', 'investor update', 'pitch', 'business plan', 'social media post', 'linkedin post', 'tweet'],
  capabilities: [
    { name: 'Blog Posts', description: 'Write SEO-optimized blog posts and articles', examples: ['Write a blog post about AI trends'] },
    { name: 'Email Campaigns', description: 'Create email marketing sequences', examples: ['Write a cold email sequence'] },
    { name: 'Social Media Copy', description: 'Create engaging social media posts', examples: ['Write 10 LinkedIn posts'] },
    { name: 'Landing Page Copy', description: 'Write conversion-optimized landing page content', examples: ['Write landing page copy'] },
    { name: 'Product Descriptions', description: 'Write compelling product descriptions', examples: ['Write product descriptions'] },
    { name: 'Business Documents', description: 'Draft business plans, proposals, pitch decks', examples: ['Write an investor update'] },
  ],
  systemPrompt: `You are an expert content writer for startups. Write clear, engaging, professional content.
Output valid JSON:
{"content":"<markdown>","title":"<title>","wordCount":<number>,"seoKeywords":["<k1>","<k2>"],"suggestions":["<tip>"]}`,
  temperature: 0.7,
};

@Injectable()
export class WritingAgent extends AgentBase {
  readonly name = CONFIG.name;
  readonly layer = CONFIG.layer;
  readonly capabilities = CONFIG.capabilities;

  constructor(llm: LLMService) {
    super(llm, CONFIG);
  }

  protected override formatResponse(parsed: Record<string, any>): string {
    const title = parsed.title || 'Written Content';
    const content = parsed.content || '';
    const words = parsed.wordCount || 'N/A';
    const kw = (parsed.seoKeywords || []).join(', ');
    return `## ${title}\n\n${content}\n\n---\n*${words} words • SEO keywords: ${kw}*`;
  }
}
