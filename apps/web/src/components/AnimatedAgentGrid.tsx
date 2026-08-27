'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Search, TrendingUp, Globe, Users, BarChart3, Mail, Sparkles, Settings, Clock, Shield } from 'lucide-react';

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

const LAYER_COLORS: Record<string, string> = {
  Research: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Marketing: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Operations: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Finance: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export function AnimatedAgentGrid() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 px-6 bg-surface-50/30" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Meet your AI team
          </h2>
          <p className="text-surface-600 text-lg max-w-xl mx-auto">
            15 specialists across Research, Marketing, Operations, and Finance.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.3, delay: i * 0.05, type: 'spring', damping: 20 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="p-4 rounded-xl bg-surface-100 border border-surface-300/50 hover:border-helm-500/30 hover:bg-surface-200/50 transition-all text-center group cursor-default"
            >
              <agent.icon className="w-5 h-5 text-surface-600 group-hover:text-helm-400 transition-colors mx-auto mb-2" />
              <div className="text-xs font-medium text-white mb-1.5 leading-tight">{agent.name}</div>
              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${LAYER_COLORS[agent.layer] || ''}`}>
                {agent.layer}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
