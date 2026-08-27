'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Bot, Brain, Shield, Zap, Globe, BarChart3 } from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    title: '21 Specialist AI Agents',
    description: 'Research, marketing, operations, and finance teams — each staffed with AI agents that specialize in their domain.',
    gradient: 'from-helm-500 to-indigo-600',
  },
  {
    icon: Brain,
    title: 'Hybrid Orchestration',
    description: 'A global orchestrator routes tasks to the right team. An event bus lets agents react to each other in real-time.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Risk-Tiered Autonomy',
    description: 'You control what agents can do. Research runs automatically. Ad spend requires your approval. Always.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Zap,
    title: 'Continuous Operation',
    description: 'Helm runs 24/7 — scanning competitors, monitoring cash flow, scheduling posts — not just when you ask.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: Globe,
    title: '22+ Integrations',
    description: 'Connect Google Workspace, Meta Ads, Slack, Tally, Stripe, and more through one-click OAuth.',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Intelligence',
    description: 'Live competitor tracking, cash flow forecasting, lead scoring, and campaign performance dashboards.',
    gradient: 'from-rose-500 to-pink-600',
  },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, type: 'spring', damping: 20 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative p-6 rounded-2xl bg-surface-100/50 border border-surface-300/50 hover:border-surface-400/50 hover:bg-surface-100/80 transition-all duration-300"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(99,102,241,0.05), transparent 70%)',
        }}
      />
      
      <div className="relative z-10">
        <motion.div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg opacity-80 group-hover:opacity-100 transition-opacity`}
          whileHover={{ rotate: 5, scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <feature.icon className="w-6 h-6 text-white" />
        </motion.div>
        <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
        <p className="text-sm text-surface-600 leading-relaxed">{feature.description}</p>
      </div>
    </motion.div>
  );
}

export function AnimatedFeatures() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="py-24 px-6" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Everything your startup needs
          </h2>
          <p className="text-surface-600 text-lg max-w-xl mx-auto">
            Four functional layers, 21 specialist agents, one unified platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
