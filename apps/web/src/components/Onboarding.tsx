'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Anchor, ArrowRight, CheckCircle, Loader2, Sparkles } from 'lucide-react';

interface OnboardingState {
  step: { id: string; question: string; category: string };
  progress: number;
  completed: boolean;
  greeting?: string;
  answers: Record<string, string>;
}

interface Props { onComplete: () => void; onSkip: () => void; }

export function Onboarding({ onComplete, onSkip }: Props) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => { fetchState(); }, []);

  const fetchState = async () => {
    try { const d = await api.getOnboardingState(); setState(d); if (d.completed) onComplete(); } catch {} setLoading(false);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      const r = await api.submitOnboardingAnswer(answer);
      if (r.completed) { setSummary(r.summary || 'Setup complete!'); setTimeout(onComplete, 2000); }
      else { setAnswer(''); await fetchState(); }
    } catch {} setSubmitting(false);
  };

  const handleSkip = async () => { await api.skipOnboarding(); onSkip(); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-surface-0"><Loader2 className="w-8 h-8 text-helm-400 animate-spin" /></div>;
  if (!state) return null;

  if (summary) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="max-w-md text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">You&apos;re all set!</h2>
        <p className="text-surface-600 text-sm leading-relaxed mb-4">{summary}</p>
        <p className="text-surface-600 text-xs">Redirecting to your team...</p>
      </div>
    </div>
  );

  const stepNum = Math.floor(state.progress / 12.5) + 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4 relative">
      {/* Background orbs */}
      <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-helm-500/[0.07] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full bg-purple-500/[0.05] blur-[80px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
              <Anchor className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-surface-600 text-sm">Let me learn about your business</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-surface-600 mb-2">
            <span>Step {stepNum} of 8</span>
            <span className="tabular-nums">{state.progress}%</span>
          </div>
          <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-helm-600 to-helm-400 rounded-full transition-all duration-500" style={{ width: `${state.progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          {state.greeting && (
            <div className="mb-6 p-4 rounded-xl bg-helm-500/5 border border-helm-500/10">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-helm-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-surface-700 leading-relaxed">{state.greeting}</p>
              </div>
            </div>
          )}

          <h3 className="text-base font-semibold text-white mb-5">{state.step?.question}</h3>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={3}
            className="input-field resize-none text-sm mb-4"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />

          <div className="flex items-center gap-3">
            <button onClick={handleSubmit} disabled={!answer.trim() || submitting} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-40">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
            </button>
            <button onClick={handleSkip} className="btn-ghost text-sm border border-surface-300">Skip</button>
          </div>
        </div>

        {/* Previous answers */}
        {Object.keys(state.answers).length > 0 && (
          <div className="mt-5 space-y-1.5">
            {Object.entries(state.answers).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-surface-600"><span className="text-surface-700 font-medium">{key.replace(/_/g, ' ')}:</span> {value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
