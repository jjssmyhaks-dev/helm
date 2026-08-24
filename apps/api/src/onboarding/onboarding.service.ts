import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';
import { ContextService } from '../context/context.service.js';

export interface OnboardingStep {
  id: string;
  question: string;
  category: string;
  required: boolean;
}

export interface OnboardingState {
  founderId: string;
  currentStep: number;
  completed: boolean;
  answers: Record<string, string>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 'business_overview', question: "Tell me about your business. What do you sell, and who are your customers?", category: 'business', required: true },
  { id: 'current_stage', question: "What stage is your business at? (pre-revenue, early revenue, growth, scaling)", category: 'business', required: true },
  { id: 'biggest_challenge', question: "What's your biggest challenge right now? Where do you need the most help?", category: 'goals', required: true },
  { id: 'revenue_range', question: "What's your approximate monthly revenue range?", category: 'finance', required: false },
  { id: 'team_size', question: "Just you, or do you have any team members?", category: 'operations', required: false },
  { id: 'tools_used', question: "What tools are you currently using? (e.g., Stripe, Shopify, Meta Ads, Tally)", category: 'tools', required: false },
  { id: 'marketing_channels', question: "How are you currently acquiring customers? (organic, paid ads, referrals, etc.)", category: 'marketing', required: false },
  { id: 'top_priority', question: "If Helm could do ONE thing for you this week, what would it be?", category: 'goals', required: true },
];

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private contextService: ContextService,
  ) {}

  /**
   * Load onboarding state from DB.
   * Uses FounderContext table: goals stores currentStep, decisions stores answers.
   */
  private async loadState(founderId: string): Promise<OnboardingState> {
    const ctx = await this.prisma.founderContext.findUnique({ where: { founderId } });

    if (!ctx) {
      return { founderId, currentStep: 0, completed: false, answers: {} };
    }

    const goals = (ctx.goals as any[]) || [];
    const decisions = (ctx.decisions as any[]) || [];

    // Check if onboarding is marked complete
    const completedFlag = goals.find((g: any) => g.key === 'onboarding_complete');
    if (completedFlag) {
      // Load saved answers
      const answers: Record<string, string> = {};
      for (const d of decisions) {
        if (d.key?.startsWith('onboarding_')) {
          answers[d.key.replace('onboarding_', '')] = d.value || '';
        }
      }
      return { founderId, currentStep: ONBOARDING_STEPS.length, completed: true, answers };
    }

    // Load current step
    const stepEntry = goals.find((g: any) => g.key === 'onboarding_step');
    const currentStep = stepEntry ? Number(stepEntry.value) || 0 : 0;

    // Load answers
    const answers: Record<string, string> = {};
    for (const d of decisions) {
      if (d.key?.startsWith('onboarding_')) {
        answers[d.key.replace('onboarding_', '')] = d.value || '';
      }
    }

    return { founderId, currentStep, completed: false, answers };
  }

  /**
   * Save onboarding state to DB.
   */
  private async saveState(state: OnboardingState): Promise<void> {
    const existing = await this.prisma.founderContext.findUnique({ where: { founderId: state.founderId } });

    // Convert answers to decisions array
    const decisions = Object.entries(state.answers).map(([key, value]) => ({
      key: `onboarding_${key}`,
      value,
      timestamp: new Date().toISOString(),
    }));

    // Add step tracker
    const goals = [
      { key: 'onboarding_step', value: String(state.currentStep) },
      ...(state.completed ? [{ key: 'onboarding_complete', value: 'true' }] : []),
    ];

    if (existing) {
      await this.prisma.founderContext.update({
        where: { founderId: state.founderId },
        data: { goals: goals as any, decisions: decisions as any },
      });
    } else {
      await this.prisma.founderContext.create({
        data: {
          founderId: state.founderId,
          goals: goals as any,
          decisions: decisions as any,
          facts: [] as any,
        },
      });
    }
  }

  getState(founderId: string): OnboardingState {
    // Synchronous fallback — used only for the in-memory check
    // Real state is loaded async via loadState
    return { founderId, currentStep: 0, completed: false, answers: {} };
  }

  async getCurrentQuestion(founderId: string): Promise<{ step: OnboardingStep; progress: number; greeting?: string; answers: Record<string, string> }> {
    const state = await this.loadState(founderId);
    if (state.completed) {
      return { step: ONBOARDING_STEPS[0], progress: 100, answers: state.answers };
    }

    const step = ONBOARDING_STEPS[state.currentStep] || ONBOARDING_STEPS[0];
    const progress = Math.round((state.currentStep / ONBOARDING_STEPS.length) * 100);

    const greeting = state.currentStep === 0
      ? "Welcome to Helm! I'm your AI team. Let me learn about your business so I can help you effectively. This will take about 2 minutes."
      : undefined;

    return { step, progress, greeting, answers: state.answers };
  }

  async submitAnswer(founderId: string, answer: string): Promise<{
    nextQuestion?: OnboardingStep;
    progress: number;
    completed: boolean;
    summary?: string;
    answers: Record<string, string>;
  }> {
    const state = await this.loadState(founderId);
    const currentStep = ONBOARDING_STEPS[state.currentStep];

    if (!currentStep) {
      return { progress: 100, completed: true, answers: state.answers };
    }

    // Store the answer
    state.answers[currentStep.id] = answer;

    // Save to context memory
    await this.contextService.save(
      founderId,
      `onboarding.${currentStep.id}`,
      answer,
      ['onboarding', currentStep.category],
    );

    // Move to next step
    state.currentStep++;

    // Check if complete
    if (state.currentStep >= ONBOARDING_STEPS.length) {
      state.completed = true;
      await this.saveState(state);

      const summary = await this.generateSummary(founderId, state.answers);
      await this.contextService.save(founderId, 'business_profile', summary, ['onboarding', 'profile', 'business']);

      return { progress: 100, completed: true, summary, answers: state.answers };
    }

    await this.saveState(state);
    const nextStep = ONBOARDING_STEPS[state.currentStep];
    const progress = Math.round((state.currentStep / ONBOARDING_STEPS.length) * 100);

    return { nextQuestion: nextStep, progress, completed: false, answers: state.answers };
  }

  async skipOnboarding(founderId: string): Promise<void> {
    const state: OnboardingState = {
      founderId,
      currentStep: ONBOARDING_STEPS.length,
      completed: true,
      answers: {},
    };
    await this.saveState(state);
  }

  async isCompleted(founderId: string): Promise<boolean> {
    const state = await this.loadState(founderId);
    return state.completed;
  }

  private async generateSummary(founderId: string, answers: Record<string, string>): Promise<string> {
    const answerText = Object.entries(answers)
      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
      .join('\n');

    try {
      const response = await this.llm.complete([
        {
          role: 'system',
          content: 'You are creating a concise business profile summary for a solo founder. Summarize their business in 3-4 sentences that will help their AI team understand the context.',
        },
        {
          role: 'user',
          content: `Create a business profile from these onboarding answers:\n\n${answerText}`,
        },
      ], { maxTokens: 500 });

      return response.content;
    } catch (err) {
      this.logger.error('Failed to generate summary', err);
      return answerText;
    }
  }
}
