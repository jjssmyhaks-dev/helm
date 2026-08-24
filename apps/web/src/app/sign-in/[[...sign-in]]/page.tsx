'use client';

import { SignIn } from '@clerk/nextjs';
import { Anchor, ArrowRight, Bot, Shield, Zap, BarChart3 } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-surface-0">
      {/* Left side — Branding hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-helm-900 via-surface-0 to-surface-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_50%)]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Helm</span>
          </div>

          {/* Main text */}
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Your AI team
              <br />
              <span className="text-gradient-helm">for every function.</span>
            </h1>
            <p className="text-surface-600 text-lg leading-relaxed">
              Research, marketing, operations, and finance — all coordinated by AI agents that work continuously in the background.
            </p>
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {[
              { icon: Bot, label: '21 Specialist AI Agents', desc: 'Across 4 functional layers' },
              { icon: Shield, label: 'Risk-Tiered Autonomy', desc: 'You control what agents can do' },
              { icon: Zap, label: 'Continuous Operation', desc: 'Runs 24/7, not just on-demand' },
              { icon: BarChart3, label: 'Real-Time Intelligence', desc: 'Live data feeds & analytics' },
            ].map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors group"
              >
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

      {/* Right side — Sign in form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.03),transparent_70%)]" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
              <Anchor className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Helm</span>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-surface-600">Sign in to your AI team</p>
          </div>

          {/* Clerk sign in */}
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-transparent border-0 shadow-none p-0 w-full',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'w-full bg-surface-100 border border-surface-300 text-white hover:bg-surface-200 hover:border-surface-400 rounded-xl h-12 font-medium transition-all duration-200',
                socialButtonsBlockButtonText: 'text-white font-medium',
                dividerLine: 'bg-surface-300',
                dividerText: 'text-surface-600 text-sm',
                formFieldLabel: 'text-surface-700 text-sm font-medium',
                formFieldInput: 'bg-surface-100 border-surface-300 text-white rounded-xl h-12 focus:ring-2 focus:ring-helm-500/30 focus:border-helm-500',
                formButtonPrimary: 'w-full bg-gradient-to-r from-helm-600 to-helm-500 hover:from-helm-500 hover:to-helm-400 text-white rounded-xl h-12 font-semibold shadow-glow transition-all duration-200',
                footerActionLink: 'text-helm-400 hover:text-helm-300 font-medium',
                footerActionText: 'text-surface-600',
                identityPreviewEditButton: 'text-helm-400',
              },
            }}
          />

          {/* Sign up link */}
          <p className="text-center text-surface-600 text-sm mt-8">
            Don&apos;t have an account?{' '}
            <a href="/sign-up" className="text-helm-400 hover:text-helm-300 font-medium transition-colors">
              Get started free
            </a>
          </p>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 mt-8 text-xs text-surface-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              SOC 2 compliant
            </span>
            <span className="w-1 h-1 rounded-full bg-surface-500" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
