'use client';

import Link from 'next/link';
import {
  Anchor,
  ArrowRight,
  Bot,
  Shield,
  Zap,
  BarChart3,
  Brain,
  Users,
  Mail,
  Search,
  Settings,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Globe,
  Clock,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    title: '21 Specialist AI Agents',
    description: 'Research, marketing, operations, and finance teams — each staffed with AI agents that specialize in their domain.',
    color: 'from-helm-500 to-indigo-600',
  },
  {
    icon: Brain,
    title: 'Hybrid Orchestration',
    description: 'A global orchestrator routes tasks to the right team. An event bus lets agents react to each other in real-time.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Risk-Tiered Autonomy',
    description: 'You control what agents can do. Research runs automatically. Ad spend requires your approval. Always.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Zap,
    title: 'Continuous Operation',
    description: 'Helm runs 24/7 — scanning competitors, monitoring cash flow, scheduling posts — not just when you ask.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: Globe,
    title: '22+ Integrations',
    description: 'Connect Google Workspace, Meta Ads, Slack, Tally, Stripe, and more through one-click OAuth.',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Intelligence',
    description: 'Live competitor tracking, cash flow forecasting, lead scoring, and campaign performance dashboards.',
    color: 'from-rose-500 to-pink-600',
  },
];

const AGENTS = [
  { icon: Search, name: 'Competitor Intelligence', layer: 'Research' },
  { icon: TrendingUp, name: 'Market & Trends', layer: 'Research' },
  { icon: Globe, name: 'Pricing & Benchmarking', layer: 'Research' },
  { icon: Users, name: 'Audience Research', layer: 'Research' },
  { icon: BarChart3, name: 'Performance Marketing', layer: 'Marketing' },
  { icon: Mail, name: 'Content & Copywriter', layer: 'Marketing' },
  { icon: Search, name: 'SEO Specialist', layer: 'Marketing' },
  { icon: Sparkles, name: 'Designer', layer: 'Marketing' },
  { icon: Users, name: 'Social & Community', layer: 'Marketing' },
  { icon: Settings, name: 'Process & Workflow', layer: 'Operations' },
  { icon: Clock, name: 'Scheduling & Capacity', layer: 'Operations' },
  { icon: Mail, name: 'Customer Support', layer: 'Operations' },
  { icon: BarChart3, name: 'Cash Flow & Forecasting', layer: 'Finance' },
  { icon: TrendingUp, name: 'Unit Economics', layer: 'Finance' },
  { icon: Shield, name: 'Compliance & Tax', layer: 'Finance' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Sign up & tell us about your business', description: 'A 5-question onboarding gives Helm context about your startup, market, and goals.' },
  { step: '2', title: 'Connect your tools', description: 'One-click OAuth to Google, Meta, Slack, Tally, and 18 more integrations.' },
  { step: '3', title: 'Helm gets to work', description: 'Agents start scanning, monitoring, and preparing insights immediately.' },
  { step: '4', title: 'Chat or use voice to direct your team', description: 'Ask anything. Helm routes to the right specialist and streams the response.' },
];

const LAYER_COLORS: Record<string, string> = {
  Research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Marketing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Operations: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Finance: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export function LandingPage({ onGetStarted }: { onGetStarted?: () => void } = {}) {
  return (
    <div className="min-h-screen bg-surface-0 text-white overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-surface-300/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-glow">
              <Anchor className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Helm</span>
          </div>
          <div className="flex items-center gap-3">
            {onGetStarted ? (
              <button
                onClick={onGetStarted}
                className="text-sm text-surface-600 hover:text-white transition-colors font-medium px-4 py-2"
              >
                Sign in
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="text-sm text-surface-600 hover:text-white transition-colors font-medium px-4 py-2"
              >
                Sign in
              </Link>
            )}
            {onGetStarted ? (
              <button
                onClick={onGetStarted}
                className="text-sm font-medium bg-gradient-to-r from-helm-600 to-helm-500 text-white px-5 py-2.5 rounded-xl hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow"
              >
                Get started free
              </button>
            ) : (
              <Link
                href="/sign-up"
                className="text-sm font-medium bg-gradient-to-r from-helm-600 to-helm-500 text-white px-5 py-2.5 rounded-xl hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow"
              >
                Get started free
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-helm-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-violet-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-100 border border-surface-300/50 text-xs text-surface-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Now in early access — 100% free during beta
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Your AI team
            <br />
            <span className="text-gradient-helm">for every function.</span>
          </h1>

          <p className="text-lg md:text-xl text-surface-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Replace hiring 4 departments with one AI platform. Research, marketing, operations,
            and finance — all coordinated by 21 specialist agents that work 24/7.
          </p>

          <div className="flex items-center justify-center gap-4">
            {onGetStarted ? (
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow text-base"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/sign-up"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow text-base"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-surface-300 text-surface-700 hover:text-white hover:border-surface-400 transition-all text-base"
            >
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 mt-12 text-xs text-surface-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Setup in 2 minutes
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything your startup needs
            </h2>
            <p className="text-surface-600 text-lg max-w-xl mx-auto">
              Four functional layers, 21 specialist agents, one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-surface-100/50 border border-surface-300/50 hover:border-surface-400/50 hover:bg-surface-100 transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent grid */}
      <section className="py-20 px-6 bg-surface-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Meet your AI team
            </h2>
            <p className="text-surface-600 text-lg max-w-xl mx-auto">
              21 specialists across Research, Marketing, Operations, and Finance.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {AGENTS.map((agent, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-surface-100 border border-surface-300/50 hover:border-helm-500/30 hover:bg-surface-200/50 transition-all text-center group"
              >
                <agent.icon className="w-5 h-5 text-surface-600 group-hover:text-helm-400 transition-colors mx-auto mb-2" />
                <div className="text-xs font-medium text-white mb-1 leading-tight">{agent.name}</div>
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${LAYER_COLORS[agent.layer] || ''}`}>
                  {agent.layer}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Up and running in minutes
            </h2>
            <p className="text-surface-600 text-lg">
              No complex setup. No config files. Just sign up and start talking to your team.
            </p>
          </div>

          <div className="space-y-6">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={i} className="flex items-start gap-5 p-5 rounded-2xl bg-surface-100/50 border border-surface-300/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helm-600 to-helm-500 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-glow">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-surface-600 leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 rounded-3xl bg-gradient-to-br from-helm-900/50 via-surface-100 to-surface-100 border border-helm-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-helm-500/[0.1] rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to hire your AI team?
              </h2>
              <p className="text-surface-600 text-base mb-8 max-w-md mx-auto">
                Join the beta and get access to 21 specialist agents, 22+ integrations, and continuous operation — all free.
              </p>
              {onGetStarted ? (
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow text-base"
                >
                  Get started free
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold hover:from-helm-500 hover:to-helm-400 transition-all shadow-glow text-base"
                >
                  Get started free
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-surface-300/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center">
              <Anchor className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-surface-600">Helm</span>
          </div>
          <p className="text-xs text-surface-600">© 2025 Helm. AI Operating System for Solo Founders.</p>
        </div>
      </footer>
    </div>
  );
}
