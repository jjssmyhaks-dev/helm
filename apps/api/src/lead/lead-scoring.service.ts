import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
  ) {}

  /**
   * Score a lead using AI analysis of fit, engagement, and intent signals.
   * Stores the score history and updates the lead's overall score.
   */
  async scoreLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { activities: true },
    });

    if (!lead) throw new Error(`Lead ${leadId} not found`);

    // Get founder context for ICP (Ideal Customer Profile)
    const founderContext = await this.prisma.founderContext.findUnique({
      where: { founderId: lead.founderId },
    });

    const founder = await this.prisma.founder.findUnique({
      where: { id: lead.founderId },
    });

    // Build scoring prompt
    const scoringPrompt = `You are a lead scoring AI for a ${founder?.businessType || 'startup'} in the ${founder?.industry || 'tech'} industry.

Analyze this lead and output a JSON score:

Lead Information:
- Name: ${lead.name}
- Email: ${lead.email || 'N/A'}
- Company: ${lead.company || 'N/A'}
- Title: ${lead.title || 'N/A'}
- Source: ${lead.source || 'N/A'}
- Website: ${lead.website || 'N/A'}
- LinkedIn: ${lead.linkedinUrl || 'N/A'}

Activity History: ${lead.activities.length} interactions
${lead.activities.map((a) => `- ${a.type}: ${a.description}`).join('\n') || 'No activities yet'}

Founder's Goals: ${JSON.stringify((founderContext?.goals as string[]) || [])}
Founder's Business: ${founder?.businessName || 'N/A'} — ${founder?.businessType || 'N/A'}

Score each dimension 0-100:
{
  "fitScore": <how well this lead matches the founder's ideal customer profile>,
  "engagementScore": <level of engagement shown through activities>,
  "intentScore": <signals of buying intent from behavior and data>,
  "factors": {
    "strengths": ["<strength1>", "<strength2>"],
    "weaknesses": ["<weakness1>", "<weakness2>"],
    "recommendation": "<one-line recommendation>"
  }
}`;

    try {
      const response = await this.llm.complete([
        { role: 'system', content: 'You are a lead scoring analyst. Output valid JSON only.' },
        { role: 'user', content: scoringPrompt },
      ], { maxTokens: 512, temperature: 0.2 });

      const parsed = JSON.parse(response.content);

      const fitScore = Math.min(100, Math.max(0, parsed.fitScore || 50));
      const engagementScore = Math.min(100, Math.max(0, parsed.engagementScore || 30));
      const intentScore = Math.min(100, Math.max(0, parsed.intentScore || 40));
      const overallScore = Math.round(fitScore * 0.4 + engagementScore * 0.3 + intentScore * 0.3);

      // Store score history
      const scoreRecord = await this.prisma.leadScore.create({
        data: {
          leadId,
          fitScore,
          engagementScore,
          intentScore,
          overallScore,
          factors: parsed.factors || {},
        },
      });

      // Update lead's current score
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { score: overallScore, scoreDetails: parsed.factors },
      });

      this.logger.log(`Scored lead ${leadId}: overall=${overallScore}`);

      return scoreRecord;
    } catch (err: any) {
      this.logger.error(`Lead scoring failed: ${err.message}`);

      // Fallback: rule-based scoring
      return this.ruleBasedScore(lead);
    }
  }

  /**
   * Simple rule-based fallback when AI scoring fails.
   */
  private async ruleBasedScore(lead: any) {
    let fitScore = 50;
    let engagementScore = 20;
    let intentScore = 30;

    // Fit signals
    if (lead.company) fitScore += 10;
    if (lead.title) fitScore += 10;
    if (lead.linkedinUrl) fitScore += 10;
    if (lead.website) fitScore += 5;

    // Engagement signals
    engagementScore += Math.min(50, lead.activities.length * 10);
    if (lead.lastContactedAt) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceContact < 7) engagementScore += 20;
      else if (daysSinceContact < 30) engagementScore += 10;
    }

    // Intent signals
    if (lead.source === 'website') intentScore += 15;
    if (lead.source === 'referral') intentScore += 20;
    if (lead.source === 'demo_request') intentScore += 30;

    fitScore = Math.min(100, fitScore);
    engagementScore = Math.min(100, engagementScore);
    intentScore = Math.min(100, intentScore);

    const overallScore = Math.round(fitScore * 0.4 + engagementScore * 0.3 + intentScore * 0.3);

    const scoreRecord = await this.prisma.leadScore.create({
      data: {
        leadId: lead.id,
        fitScore,
        engagementScore,
        intentScore,
        overallScore,
        factors: { method: 'rule-based', strengths: [], weaknesses: [], recommendation: 'Rule-based score' },
      },
    });

    await this.prisma.lead.update({
      where: { id: lead.id },
      data: { score: overallScore },
    });

    return scoreRecord;
  }
}
