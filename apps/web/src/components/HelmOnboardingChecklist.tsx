'use client';

import {
  IconArchive,
  IconChevronRight,
  IconCircleCheckFilled,
  IconCircleDashed,
  IconDots,
  IconMail,
} from '@tabler/icons-react';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const steps = [
  {
    id: 'profile',
    title: 'Complete your profile',
    description:
      'Add your name, photo, and role so your AI team knows who you are.',
    completed: true,
    actionLabel: 'Edit profile',
    actionHref: '/settings',
  },
  {
    id: 'workspace',
    title: 'Set up your workspace',
    description:
      'Tell Helm about your company, industry, and team size to personalize your AI agents.',
    completed: false,
    actionLabel: 'Configure workspace',
    actionHref: '/onboarding',
  },
  {
    id: 'integrations',
    title: 'Connect integrations',
    description:
      'Link your tools — Google Sheets, Slack, Meta Ads, WhatsApp, Tally — so agents can take real actions.',
    completed: false,
    actionLabel: 'Browse integrations',
    actionHref: '/connectors',
  },
  {
    id: 'agents',
    title: 'Configure your AI agents',
    description:
      'Set autonomy levels, connect LLM providers, and choose which agents are active for your team.',
    completed: false,
    actionLabel: 'Manage agents',
    actionHref: '/settings',
  },
  {
    id: 'first-chat',
    title: 'Have your first conversation',
    description:
      'Ask Helm about your cash flow, draft a marketing plan, or research your competitors.',
    completed: false,
    actionLabel: 'Start chatting',
    actionHref: '/',
  },
  {
    id: 'notifications',
    title: 'Set up notifications',
    description:
      'Choose how and when you want to be notified about agent actions, approvals, and alerts.',
    completed: false,
    actionLabel: 'Manage notifications',
    actionHref: '/settings',
  },
];

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  actionHref: string;
}

function CircularProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const progress = total > 0 ? ((total - completed) / total) * 100 : 0;
  const strokeDashoffset = 100 - progress;

  return (
    <svg className="-rotate-90" height="14" viewBox="0 0 14 14" width="14">
      <circle
        className="stroke-muted"
        cx="7"
        cy="7"
        fill="none"
        pathLength="100"
        r="6"
        strokeWidth="2"
      />
      <circle
        className="stroke-primary"
        cx="7"
        cy="7"
        fill="none"
        pathLength="100"
        r="6"
        strokeDasharray="100"
        strokeLinecap="round"
        strokeWidth="2"
        style={{ strokeDashoffset }}
      />
    </svg>
  );
}

function StepIndicator({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <IconCircleCheckFilled
        aria-hidden="true"
        className="mt-1 size-4.5 shrink-0 text-primary"
      />
    );
  }
  return (
    <IconCircleDashed
      aria-hidden="true"
      className="mt-1 size-5 shrink-0 stroke-muted-foreground/40"
      strokeWidth={2}
    />
  );
}

interface HelmOnboardingChecklistProps {
  onNavigate?: (href: string) => void;
}

export function HelmOnboardingChecklist({ onNavigate }: HelmOnboardingChecklistProps) {
  const [currentSteps, setCurrentSteps] = useState<OnboardingStep[]>(steps);
  const [openStepId, setOpenStepId] = useState<string | null>(() => {
    const firstIncomplete = steps.find((s) => !s.completed);
    return firstIncomplete?.id ?? steps[0]?.id ?? null;
  });
  const [dismissed, setDismissed] = useState(false);

  const completedCount = currentSteps.filter((s) => s.completed).length;
  const remainingCount = currentSteps.length - completedCount;

  const handleStepClick = (stepId: string) => {
    setOpenStepId(openStepId === stepId ? null : stepId);
  };

  const handleStepAction = (step: OnboardingStep) => {
    const updated = currentSteps.map((s) =>
      s.id === step.id ? { ...s, completed: true } : s,
    );
    setCurrentSteps(updated);
    const nextIncomplete = updated.find((s) => !s.completed);
    setOpenStepId(nextIncomplete?.id ?? null);
    if (onNavigate) onNavigate(step.actionHref);
  };

  if (dismissed) {
    return (
      <div className="rounded-2xl border border-surface-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-surface-500">Checklist dismissed</p>
        <button
          className="mt-2 text-helm-500 text-sm underline hover:text-helm-600"
          onClick={() => setDismissed(false)}
        >
          Show again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-2xl border border-surface-200 bg-white p-4 text-foreground shadow-sm">
        {/* Header */}
        <div className="mr-2 mb-4 flex flex-col justify-between sm:flex-row sm:items-center">
          <h3 className="ml-2 text-balance font-semibold text-foreground">
            Get started with Helm
          </h3>
          <div className="mt-2 flex items-center justify-end sm:mt-0">
            <CircularProgress
              completed={remainingCount}
              total={currentSteps.length}
            />
            <div className="mr-3 ml-1.5 text-surface-500 text-sm">
              <span className="font-medium text-foreground">
                {completedCount}
              </span>
              {' / '}
              <span className="font-medium text-foreground">
                {currentSteps.length}
              </span>{' '}
              completed
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-6 w-6" size="icon" variant="ghost">
                  <IconDots aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="sr-only">Options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => setDismissed(true)}>
                  <IconArchive
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 shrink-0"
                  />
                  Dismiss
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open('mailto:support@gethelm.ai?subject=Feedback')
                  }
                >
                  <IconMail
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 shrink-0"
                  />
                  Give feedback
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {currentSteps.map((step, index) => {
            const isOpen = openStepId === step.id;
            const isFirst = index === 0;
            const prevStep = currentSteps[index - 1];
            const isPrevOpen = prevStep && openStepId === prevStep.id;

            const showBorderTop = !(isFirst || isOpen || isPrevOpen);

            return (
              <div
                className={cn(
                  'group',
                  isOpen && 'rounded-lg',
                  showBorderTop && 'border-border border-t',
                )}
                key={step.id}
              >
                <div
                  className={cn(
                    'block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isOpen && 'rounded-lg',
                  )}
                  onClick={() => handleStepClick(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStepClick(step.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className={cn(
                      'relative overflow-hidden rounded-lg transition-colors',
                      isOpen && 'border border-surface-200 bg-surface-50',
                    )}
                  >
                    <div className="relative flex items-center justify-between gap-3 py-3 pr-2 pl-4">
                      <div className="flex w-full gap-3">
                        <div className="shrink-0">
                          <StepIndicator completed={step.completed} />
                        </div>
                        <div className="mt-0.5 grow">
                          <h4
                            className={cn(
                              'font-semibold',
                              step.completed
                                ? 'text-primary'
                                : 'text-foreground',
                            )}
                          >
                            {step.title}
                          </h4>
                          <Collapsible open={isOpen}>
                            <CollapsibleContent>
                              <p className="mt-2 text-pretty text-surface-500 text-sm sm:max-w-64 md:max-w-xs">
                                {step.description}
                              </p>
                              <a
                                className={cn(
                                  buttonVariants({ size: 'sm' }),
                                  'mt-3',
                                )}
                                href={step.actionHref}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleStepAction(step);
                                }}
                              >
                                {step.actionLabel}
                              </a>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </div>
                      {!isOpen && (
                        <IconChevronRight
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-surface-400"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
