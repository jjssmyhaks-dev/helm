import { Injectable } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { AgentBase, AgentConfig } from './agent-base.js';
import { AgentResult } from './agent-orchestrator.service.js';

const CONFIG: AgentConfig = {
  name: 'Finance Agent',
  layer: 'FINANCE',
  intentKeywords: ['cash flow', 'runway', 'burn rate', 'revenue', 'expense', 'budget', 'cac', 'ltv', 'unit economics', 'margin', 'profit', 'loss', 'p&l', 'tax', 'gst', 'compliance', 'forecast', 'financial', 'mrr', 'arr', 'accounting', 'bookkeeping', 'invoice', 'payment'],
  capabilities: [
    { name: 'Cash Flow Analysis', description: 'Analyze cash flow, runway, burn rate', examples: ['How long is my runway?'] },
    { name: 'Unit Economics', description: 'Calculate CAC, LTV, margins', examples: ['What is my CAC?'] },
    { name: 'Budget Planning', description: 'Create budgets, forecast expenses', examples: ['Create a monthly budget'] },
    { name: 'Revenue Forecasting', description: 'Project revenue, MRR/ARR', examples: ['Forecast revenue for 6 months'] },
    { name: 'Tax & Compliance', description: 'Tax obligations, GST, filing', examples: ['What are my GST obligations?'] },
    { name: 'Financial Reports', description: 'Generate P&L, balance sheets', examples: ['Generate a P&L statement'] },
  ],
  systemPrompt: `You are a senior financial analyst. Provide detailed, actionable financial analysis.
Output valid JSON:
{"analysis":"<markdown>","keyMetrics":{"<metric>":"<value>"},"alerts":["<risk>"],"recommendations":["<rec>"],"nextSteps":["<step>"]}`,
  temperature: 0.3,
};

@Injectable()
export class FinanceAgent extends AgentBase {
  readonly name = CONFIG.name;
  readonly layer = CONFIG.layer;
  readonly capabilities = CONFIG.capabilities;

  constructor(llm: LLMService, private prisma: PrismaService) {
    super(llm, CONFIG);
  }

  protected override async buildSystemPrompt(founderId: string): Promise<string> {
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    const ctx = await this.prisma.founderContext.findUnique({ where: { founderId } });
    const biz = founder?.businessName || 'a startup';
    const type = founder?.businessType || 'SaaS';
    const industry = founder?.industry || 'tech';
    return `You are a senior financial analyst for ${biz} (${type}, ${industry}).\nFounder goals: ${JSON.stringify(ctx?.goals || [])}\n\n${CONFIG.systemPrompt}`;
  }

  protected override formatResponse(parsed: Record<string, any>): string {
    let md = `## 💰 Financial Analysis\n\n${parsed.analysis || ''}\n\n`;
    if (parsed.keyMetrics && Object.keys(parsed.keyMetrics).length > 0) {
      md += `### Key Metrics\n`;
      for (const [k, v] of Object.entries(parsed.keyMetrics)) md += `- **${k}**: ${v}\n`;
      md += '\n';
    }
    if (parsed.alerts?.length > 0) md += `### ⚠️ Alerts\n${parsed.alerts.map((a: string) => `- ${a}`).join('\n')}\n\n`;
    if (parsed.recommendations?.length > 0) md += `### Recommendations\n${parsed.recommendations.map((r: string) => `- ${r}`).join('\n')}\n`;
    return md;
  }
}
