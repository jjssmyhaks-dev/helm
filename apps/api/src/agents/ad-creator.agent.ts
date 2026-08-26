import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class AdCreatorAgent implements SpecialistAgent {
  name = 'Ad Creator Agent';
  layer = 'MARKETING';
  private readonly logger = new Logger(AdCreatorAgent.name);

  capabilities = [
    { name: 'Ad Copy Variations', description: 'Generate multiple ad copy variations', examples: ['Create 10 ad copy variations'] },
    { name: 'Ad Copy Frameworks', description: 'Use AIDA, PAS, BAB frameworks', examples: ['Write an AIDA ad'] },
    { name: 'Video Ad Scripts', description: 'Write scripts for 15s/30s/60s ads', examples: ['Write a 15s TikTok ad script'] },
  ];

  constructor(private llm: LLMService) {}

  canHandle(intent: string): boolean {
    return ['ad copy', 'ad creative', 'ad variations', 'ad headlines', 'ad script', 'video ad', 'banner ad', 'write ad', 'create ad copy'].some(k => intent.toLowerCase().includes(k));
  }

  async execute(_founderId: string, _intent: string, _params: Record<string, string>, message: string): Promise<AgentResult> {
    const count = message.match(/(\d+)\s*(variations?|ads?)/i)?.[1] || '5';
    const response = await this.llm.complete([
      { role: 'system', content: `You are an expert ad copywriter. Generate ${count} ad variations. Output JSON: {"variations":[{"name":"","headline":"","primaryText":"","cta":"","platform":""}],"recommendations":[""]}` },
      { role: 'user', content: message },
    ], { maxTokens: 2048, temperature: 0.8 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 🎨 Ad Copy — ${count} Variations\n\n`;
      for (const v of parsed.variations || []) { md += `### ${v.name}\n**Headline:** ${v.headline}\n**Body:** ${v.primaryText}\n**CTA:** ${v.cta} | **Platform:** ${v.platform}\n\n`; }
      return { agentName: this.name, response: md, suggestions: parsed.recommendations || [], confidence: 0.85 };
    } catch { return { agentName: this.name, response: response.content, confidence: 0.7 }; }
  }
}
