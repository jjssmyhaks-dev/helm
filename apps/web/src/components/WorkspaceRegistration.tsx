'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Anchor, CheckCircle2 } from 'lucide-react';

const INDUSTRIES = [
  'SaaS / Software',
  'E-commerce / DTC',
  'Agency / Services',
  'Fintech / Payments',
  'Healthcare / Biotech',
  'Education / EdTech',
  'Consumer / FMCG',
  'AI / Machine Learning',
  'Other',
];

const TEAM_SIZES = [
  'Just me (solo founder)',
  '2–5 people',
  '6–15 people',
  '16–50 people',
  '50+ people',
];

const GOALS = [
  'Launch my first product',
  'Scale marketing & leads',
  'Manage operations & hiring',
  'Handle finance & compliance',
  'All of the above',
];

interface WorkspaceRegistrationProps {
  onSubmit?: (data: WorkspaceData) => void;
  onCancel?: () => void;
}

export interface WorkspaceData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  industry: string;
  teamSize: string;
  goals: string[];
  website: string;
}

export default function WorkspaceRegistration({ onSubmit, onCancel }: WorkspaceRegistrationProps) {
  const [step, setStep] = useState<'workspace' | 'preferences'>('workspace');
  const [data, setData] = useState<WorkspaceData>({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    industry: '',
    teamSize: '',
    goals: [],
    website: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof WorkspaceData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGoal = (goal: string) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter((g) => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'workspace') {
      setStep('preferences');
      return;
    }
    setSubmitted(true);
    onSubmit?.(data);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">Welcome to Helm!</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Your workspace <strong>{data.companyName}</strong> is ready. Your AI team of 27 agents is being configured.
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-10">
      <div className="sm:mx-auto sm:max-w-2xl w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <Anchor className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Helm</span>
        </div>

        <h3 className="text-balance font-semibold text-2xl text-foreground">
          {step === 'workspace' ? 'Set up your workspace' : 'Configure your AI team'}
        </h3>
        <p className="mt-1 text-pretty text-muted-foreground text-sm">
          {step === 'workspace'
            ? 'Tell us about your company so we can tailor Helm to your needs.'
            : 'Select your goals so your agents know what to prioritize.'}
        </p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          <div className={cn('h-1.5 flex-1 rounded-full transition-colors', step === 'workspace' ? 'bg-primary' : 'bg-primary')} />
          <div className={cn('h-1.5 flex-1 rounded-full transition-colors', step === 'preferences' ? 'bg-primary' : 'bg-muted')} />
        </div>

        <form onSubmit={handleSubmit} className="mt-8">
          {step === 'workspace' ? (
            <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
              {/* Personal info */}
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="first-name">
                    First name <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    autoComplete="given-name"
                    id="first-name"
                    name="first-name"
                    placeholder="First name"
                    required
                    type="text"
                    value={data.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="last-name">
                    Last name <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    autoComplete="family-name"
                    id="last-name"
                    name="last-name"
                    placeholder="Last name"
                    required
                    type="text"
                    value={data.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-full">
                <Field className="gap-2">
                  <FieldLabel htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    autoComplete="email"
                    id="email"
                    name="email"
                    placeholder="you@company.com"
                    required
                    type="email"
                    value={data.email}
                    onChange={(e) => update('email', e.target.value)}
                  />
                </Field>
              </div>

              {/* Company info */}
              <div className="col-span-full">
                <Field className="gap-2">
                  <FieldLabel htmlFor="company-name">
                    Company name <span className="text-red-500">*</span>
                  </FieldLabel>
                  <Input
                    id="company-name"
                    name="company-name"
                    placeholder="Acme Inc."
                    required
                    type="text"
                    value={data.companyName}
                    onChange={(e) => update('companyName', e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="industry">
                    Industry <span className="text-red-500">*</span>
                  </FieldLabel>
                  <select
                    id="industry"
                    name="industry"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={data.industry}
                    onChange={(e) => update('industry', e.target.value)}
                  >
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="team-size">
                    Team size <span className="text-red-500">*</span>
                  </FieldLabel>
                  <select
                    id="team-size"
                    name="team-size"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={data.teamSize}
                    onChange={(e) => update('teamSize', e.target.value)}
                  >
                    <option value="">Select team size</option>
                    {TEAM_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="col-span-full">
                <Field className="gap-2">
                  <FieldLabel htmlFor="website">Website</FieldLabel>
                  <Input
                    id="website"
                    name="website"
                    placeholder="https://yourcompany.com"
                    type="url"
                    value={data.website}
                    onChange={(e) => update('website', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          ) : (
            /* Step 2: Goals */
            <div className="space-y-4">
              <Field className="gap-3">
                <FieldLabel>
                  What do you want Helm to help with? <span className="text-red-500">*</span>
                </FieldLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleGoal(goal)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all',
                        data.goals.includes(goal)
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-surface-200 hover:bg-surface-50 text-surface-600',
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          data.goals.includes(goal)
                            ? 'border-primary bg-primary'
                            : 'border-surface-300',
                        )}
                      >
                        {data.goals.includes(goal) && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      {goal}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          <Separator className="my-6" />

          <div className="flex items-center justify-end space-x-4">
            <Button
              className="whitespace-nowrap"
              onClick={() => (step === 'preferences' ? setStep('workspace') : onCancel?.())}
              type="button"
              variant="outline"
            >
              {step === 'preferences' ? 'Back' : 'Cancel'}
            </Button>
            <Button className="whitespace-nowrap" type="submit">
              {step === 'workspace' ? 'Continue' : 'Launch Helm'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
