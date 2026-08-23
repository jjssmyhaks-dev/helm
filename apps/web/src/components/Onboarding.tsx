'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Anchor, ArrowRight, SkipForward, CheckCircle, Loader2 } from 'lucide-react';

interface OnboardingState {
  step: { id: string; question: string; category: string };
  progress: number;
  completed: boolean;
  greeting?: string;
  answers: Record<string, string>;
}

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function Onboarding({ onComplete, onSkip }: Props) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      const data = await api.getOnboardingState();
      setState(data);
      if (data.completed) {
        onComplete();
      }
    } catch {}
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);

    try {
      const result = await api.submitOnboardingAnswer(answer);
      if (result.completed) {
        setSummary(result.summary || 'Setup complete!');
        setTimeout(onComplete, 2000);
      } else {
        setAnswer('');
        await fetchState();
      }
    } catch {}
    setSubmitting(false);
  };

  const handleSkip = async () => {
    await api.skipOnboarding();
    onSkip();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <Loader2 className="w-8 h-8 text-helm-400 animate-spin" />
      </div>
    );
  }

  if (!state) return null;

  if (summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
        <div className="max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">You're all set!</h2>
          <p className="text-dark-400 mb-6">{summary}</p>
          <p className="text-dark-500 text-sm">Redirecting to your team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-helm-600 flex items-center justify-center">
              <Anchor className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-dark-500 text-sm">Let me learn about your business</p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-dark-500 mb-2">
            <span>Step {state.progress === 100 ? 'Complete' : `${Math.floor(state.progress / 12.5) + 1} of 8`}</span>
            <span>{state.progress}%</span>
          </div>
          <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-helm-500 rounded-full transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-dark-900 rounded-2xl border border-dark-700 p-8">
          {/* Greeting */}
          {state.greeting && (
            <div className="mb-6 p-4 rounded-xl bg-helm-600/10 border border-helm-500/20">
              <p className="text-sm text-helm-300 leading-relaxed">{state.greeting}</p>
            </div>
          )}

          {/* Question */}
          <h3 className="text-lg font-medium text-white mb-6">
            {state.step?.question}
          </h3>

          {/* Answer input */}
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-600 text-white placeholder-dark-500 focus:outline-none focus:border-helm-500 focus:ring-1 focus:ring-helm-500 resize-none text-sm mb-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-helm-600 hover:bg-helm-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 rounded-xl border border-dark-600 text-dark-400 hover:text-white hover:border-dark-500 transition-colors text-sm"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Previous answers */}
        {Object.keys(state.answers).length > 0 && (
          <div className="mt-6 space-y-2">
            {Object.entries(state.answers).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-dark-500">
                  <span className="text-dark-400">{key.replace(/_/g, ' ')}:</span> {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
