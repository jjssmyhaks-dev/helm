import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '../llm/llm.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { SpecialistAgent, AgentResult } from './agent-orchestrator.service.js';

@Injectable()
export class FinanceAgent implements SpecialistAgent {
  name = 'Finance Agent';
  layer = 'FINANCE';
  private readonly logger = new Logger(FinanceAgent.name);

  capabilities = [
    { name: 'Cash Flow Analysis', description: 'Analyze cash flow, runway, burn rate', examples: ['How long is my runway?', 'What\'s my burn rate?'] },
    { name: 'Unit Economics', description: 'Calculate CAC, LTV, margins, payback period', examples: ['What\'s my CAC?', 'Calculate LTV:CAC ratio'] },
    { name: 'Budget Planning', description: 'Create budgets, forecast expenses', examples: ['Create a monthly budget', 'Forecast next quarter expenses'] },
    { name: 'Revenue Forecasting', description: 'Project revenue, growth rates, MRR/ARR', examples: ['Forecast revenue for next 6 months', 'What\'s my MRR growth?'] },
    { name: 'Tax & Compliance', description: 'Tax obligations, GST, filing reminders', examples: ['What are my GST obligations?', 'When is my tax filing due?'] },
    { name: 'Financial Reports', description: 'Generate P&L, balance sheets, financial summaries', examples: ['Generate a P&L statement', 'Create a financial summary for investors'] },
  ];

  constructor(private llm: LLMService, private prisma: PrismaService) {}

  canHandle(intent: string, params: Record<string, string>): boolean {
    const keywords = ['cash flow', 'runway', 'burn rate', 'revenue', 'expense', 'budget', 'cac', 'ltv', 'unit economics', 'margin', 'profit', 'loss', 'p&l', 'tax', 'gst', 'compliance', 'forecast', 'financial', 'mrr', 'arr', 'accounting', 'bookkeeping', 'invoice', 'payment'];
    return keywords.some((k) => intent.toLowerCase().includes(k));
  }

  async execute(founderId: string, intent: string, params: Record<string, string>, message: string): Promise<AgentResult> {
    const analysisType = this.detectAnalysisType(message);

    // Get founder context for business info
    const founder = await this.prisma.founder.findUnique({ where: { id: founderId } });
    const context = await this.prisma.founderContext.findUnique({ where: { founderId } });

    const systemPrompt = `You are a senior financial analyst for ${founder?.businessName || 'a startup'}.
Business type: ${founder?.businessType || 'SaaS'}
Industry: ${founder?.industry || 'tech'}

You specialize in: ${analysisType}

Provide detailed, actionable financial analysis with specific numbers and recommendations.
Output valid JSON:
{
  "analysis": "<detailed analysis in markdown>",
  "keyMetrics": { "<metric>": "<value>" },
  "alerts": ["<financial alert or risk>"],
  "recommendations": ["<specific recommendation>"],
  "nextSteps": ["<actionable next step>"]
}`;

    const response = await this.llm.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Founder context: ${JSON.stringify(context?.goals || [])}\n\n${message}` },
    ], { maxTokens: 2048, temperature: 0.3 });

    try {
      const parsed = JSON.parse(response.content);
      let md = `## 💰 ${analysisType}\n\n${parsed.analysis}\n\n`;
      if (parsed.keyMetrics && Object.keys(parsed.keyMetrics).length > 0) {
        md += `### Key Metrics\n`;
        for (const [k, v] of Object.entries(parsed.keyMetrics)) {
          md += `- **${k}**: ${v}\n`;
        }
        md += '\n';
      }
      if (parsed.alerts?.length > 0) {
        md += `### ⚠️ Alerts\n${parsed.alerts.map((a: string) => `- ${a}`).join('\n')}\n\n`;
      }
      if (parsed.recommendations?.length > 0) {
        md += `### Recommendations\n${parsed.recommendations.map((r: string) => `- ${r}`).join('\n')}\n`;
      }
      return { agentName: this.name, response: md, suggestions: parsed.nextSteps || [], confidence: 0.85 };
    } catch {
      return { agentName: this.name, response: response.content, confidence: 0.7 };
    }
  }

  private detectAnalysisType(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('runway') || msg.includes('burn rate')) return 'Runway & Burn Rate Analysis';
    if (msg.includes('cac') || msg.includes('ltv') || msg.includes('unit economics')) return 'Unit Economics Analysis';
    if (msg.includes('budget') || msg.includes('forecast')) return 'Budget & Forecasting';
    if (msg.includes('tax') || msg.includes('gst') || msg.includes('compliance')) return 'Tax & Compliance Review';
    if (msg.includes('p&l') || msg.includes('profit') || msg.includes('loss')) return 'Profit & Loss Analysis';
    if (msg.includes('revenue') || msg.includes('mrr') || msg.includes('arr')) return 'Revenue Analysis';
    return 'Financial Health Review';
  }
}
