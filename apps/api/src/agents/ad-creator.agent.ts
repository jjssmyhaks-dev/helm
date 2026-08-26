import { Injectable } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { AgentBase, AgentConfig } from './agent-base.js';

const CONFIG: AgentConfig = {
  name: 'Ad Creator Agent',
  layer: 'MARKETING',
  intentKeywords: ['ad copy', 'ad creative', 'ad variations', 'ad headlines', 'ad script', 'video ad', 'banner ad', 'write ad', 'create ad copy'],
  capabilities: [
    { name: 'Ad Copy Variations', description: 'Generate multiple ad copy variations', examples: ['Create 10 ad copy variations'] },
    { name: 'Ad Copy Frameworks', description: 'Use AIDA, PAS, BAB frameworks', examples: ['Write an AIDA ad'] },
    { name: 'Video Ad Scripts', description: 'Write scripts for 15s/30s/60s ads', examples: ['Write a 15s TikTok ad script'] },
  ],
  systemPrompt: `You are an expert ad copywriter. Generate compelling ad variations.
Output valid JSON:
{"variations":[{"name":"","headline":"","primaryText":"","cta":"","platform":""}],"recommendations":[""]}`,
  temperature: 0.8,
};

@Injectable()
export class AdCreatorAgent extends AgentBase {
  readonly name = CONFIG.name;
  readonly layer = CONFIG.layer;
  readonly capabilities = CONFIG.capabilities;

  constructor(llm: LLMService) { super(llm, CONFIG); }

  protected override formatResponse(parsed: Record<string, any>): string {
    let md = `## 🎨 Ad Copy Variations\n\n`;
    for (const v of parsed.variations || []) md += `### ${v.name}\n**Headline:** ${v.headline}\n**Body:** ${v.primaryText}\n**CTA:** ${v.cta} | **Platform:** ${v.platform}\n\n`;
    return md;
  }
}
