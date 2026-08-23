import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LLMService } from '../llm/llm.service.js';
import { ContextService } from '../context/context.service.js';

interface OnboardingStep {
  id: string;
  question: string;
  category: string;
  required: boolean;
  followUp?: string;
}

interface OnboardingState {
  founderId: string;
  currentStep: number;
  completed: boolean;
  answers: Record<string, string>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'business_overview',
    question: "Tell me about your business. What do you sell, and who are your customers?",
    category: 'business',
    required: true,
  },
  {
    id: 'current_stage',
    question: "What stage is your business at? (pre-revenue, early revenue, growth, scaling)",
    category: 'business',
    required: true,
  },
  {
    id: 'biggest_challenge',
    question: "What's your biggest challenge right right now? Where do you need the most help?",
    category: 'goals',
    required: true,
  },
  {
    id: 'revenue_range',
    question: "What's your approximate monthly revenue range? (helps me set up financial tracking)",
    category: 'finance',
    required: false,
  },
  {
    id: 'team_size',
    question: "Just you, or do you have any team members?",
    category: 'operations',
    required: false,
  },
  {
    id: 'tools_used',
    question: "What tools are you currently using? (e.g., Stripe, Shopify, Meta Ads, Tally)",
    category: 'tools',
    required: false,
  },
  {
    id: 'marketing_channels',
    question: "How are you currently acquiring customers? (organic, paid ads, referrals, etc.)",
    category: 'marketing',
    required: false,
  },
  {
    id: 'top_priority',
    question: "If Helm could do ONE thing for you this week, what would it be?",
    category: 'goals',
    required: true,
  },
];

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);
  private states = new Map<string, OnboardingState>();

  constructor(
    private prisma: PrismaService,
    private llm: LLMService,
    private contextService: ContextService,
  ) {}

  /**
   * Get the current onboarding state for a founder.
   */
  getState(founderId: string): OnboardingState {
    return this.states.get(founderId) || {
      founderId,
      currentStep: 0,
      completed: false,
      answers: {},
    };
  }

  /**
   * Get the current onboarding question.
   */
  getCurrentQuestion(founderId: string): { step: OnboardingStep; progress: number; greeting?: string } {
    const state = this.getState(founderId);
    if (state.completed) {
      return { step: ONBOARDING_STEPS[0], progress: 100 };
    }

    const step = ONBOARDING_STEPS[state.currentStep];
    const progress = Math.round((state.currentStep / ONBOARDING_STEPS.length) * 100);

    const greeting = state.currentStep === 0
      ? "Welcome to Helm! I'm your AI team. Let me learn about your business so I can help you effectively. This will take about 2 minutes."
      : undefined;

    return { step, progress, greeting };
  }

  /**
   * Submit an answer to the current onboarding question.
   * Returns the next question or completion status.
   */
  async submitAnswer(founderId: string, answer: string): Promise<{
    nextQuestion?: OnboardingStep;
    progress: number;
    completed: boolean;
    summary?: string;
  }> {
    const state = this.getState(founderId);
    const currentStep = ONBOARDING_STEPS[state.currentStep];

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
    this.states.set(founderId, state);

    // Check if onboarding is complete
    if (state.currentStep >= ONBOARDING_STEPS.length) {
      state.completed = true;
      this.states.set(founderId, state);

      // Generate a summary of what we learned
      const summary = await this.generateSummary(founderId, state.answers);

      // Save the full business profile
      await this.contextService.save(
        founderId,
        'business_profile',
        summary,
        ['onboarding', 'profile', 'business'],
      );

      return { progress: 100, completed: true, summary };
    }

    const nextStep = ONBOARDING_STEPS[state.currentStep];
    const progress = Math.round((state.currentStep / ONBOARDING_STEPS.length) * 100);

    return { nextQuestion: nextStep, progress, completed: false };
  }

  /**
   * Generate a business profile summary from onboarding answers.
   */
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

  /**
   * Skip onboarding (for founders who want to explore first).
   */
  skipOnboarding(founderId: string): void {
    this.states.set(founderId, {
      founderId,
      currentStep: ONBOARDING_STEPS.length,
      completed: true,
      answers: {},
    });
  }

  /**
   * Check if a founder has completed onboarding.
   */
  isCompleted(founderId: string): boolean {
    const state = this.getState(founderId);
    return state.completed;
  }
}
