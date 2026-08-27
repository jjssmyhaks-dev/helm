'use client';

import { useEffect, useState } from 'react';
import { Anchor, Bot, Shield, Zap, BarChart3, ArrowRight } from 'lucide-react';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_KEY_REGEX = /^pk_(test|live)_[A-Za-z0-9+/=_-]{20,}$/;
const clerkEnabled = CLERK_KEY_REGEX.test(clerkKey);

export default function SignUpPage() {
  const [ClerkSignUp, setClerkSignUp] = useState<any>(null);

  useEffect(() => {
    if (clerkEnabled) {
      import('@clerk/nextjs').then((mod) => {
        setClerkSignUp(() => mod.SignUp);
      });
    }
  }, []);

  if (!clerkEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="text-center max-w-md p-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow mx-auto mb-6">
            <Anchor className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Sign-up not available</h1>
          <p className="text-surface-600 mb-6">
            Clerk authentication isn&apos;t configured yet. You can try Helm in demo mode instead.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow"
          >
            Try Demo Mode
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-surface-0">
      {/* Left side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-helm-900 via-surface-0 to-surface-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Helm</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Build faster with<br />
              <span className="text-gradient-helm">your AI team.</span>
            </h1>
            <p className="text-surface-600 text-lg leading-relaxed">
              Replace hiring 4 departments with one AI platform. Get started in minutes, not months.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: Bot, label: '21 Specialist AI Agents', desc: 'Across 4 functional layers' },
              { icon: Shield, label: 'Risk-Tiered Autonomy', desc: 'You control what agents can do' },
              { icon: Zap, label: 'Continuous Operation', desc: 'Runs 24/7, not just on-demand' },
              { icon: BarChart3, label: 'Real-Time Intelligence', desc: 'Live data feeds & analytics' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-helm-500/10 flex items-center justify-center group-hover:bg-helm-500/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-helm-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{feature.label}</div>
                  <div className="text-xs text-surface-600">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — Sign up form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.03),transparent_70%)]" />
        <div className="w-full max-w-sm relative z-10">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Helm</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
            <p className="text-surface-600">Start your free trial — no credit card needed</p>
          </div>

          {ClerkSignUp && (
            <ClerkSignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-transparent border-0 shadow-none p-0 w-full',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  socialButtonsBlockButton: 'hidden',
                  socialButtonsBlockButtonText: 'hidden',
                  dividerLine: 'bg-surface-300',
                  dividerText: 'text-surface-600 text-sm',
                  formFieldLabel: 'text-surface-700 text-sm font-medium',
                  formFieldInput: 'bg-surface-100 border border-surface-300 text-white rounded-xl h-12 px-4 focus:ring-2 focus:ring-helm-500/30 focus:border-helm-500',
                  formButtonPrimary: 'w-full bg-gradient-to-r from-helm-600 to-helm-500 hover:from-helm-500 hover:to-helm-400 text-white rounded-xl h-12 font-semibold shadow-glow transition-all duration-200',
                  footerActionLink: 'text-helm-400 hover:text-helm-300 font-medium',
                  footerActionText: 'text-surface-600',
                },
              }}
            />
          )}

          <p className="text-center text-surface-600 text-sm mt-8">
            Already have an account?{' '}
            <a href="/sign-in" className="text-helm-400 hover:text-helm-300 font-medium transition-colors">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
