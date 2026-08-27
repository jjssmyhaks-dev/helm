'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Activity, Shield, Plug, ChevronDown, Anchor, X, Zap } from 'lucide-react';

interface Props {
  token: string;
  open: boolean;
  onClose: () => void;
}

const DEMO_ACTIVITY = [
  { agent: 'Competitor Intelligence', action: 'Scanning competitor pricing pages', layer: 'Research', time: '2m ago' },
  { agent: 'SEO Specialist', action: 'Analyzing keyword gaps for blog content', layer: 'Marketing', time: '5m ago' },
  { agent: 'Cash Flow Forecaster', action: 'Updated runway projection to 14 months', layer: 'Finance', time: '12m ago' },
];

const CONNECTORS = [
  { name: 'Google Workspace', connected: true },
  { name: 'Meta Ads', connected: false },
  { name: 'Slack', connected: false },
  { name: 'Tally', connected: false },
  { name: 'Stripe', connected: false },
];

const LAYER_DOT: Record<string, string> = {
  Research: 'bg-blue-400',
  Marketing: 'bg-violet-400',
  Operations: 'bg-amber-400',
  Finance: 'bg-emerald-400',
};

export function AnimatedSidePanel({ token, open, onClose }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('activity');

  const toggle = (section: string) =>
    setExpandedSection((prev) => (prev === section ? null : section));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-[340px] bg-surface-0 border-l border-surface-300/50 flex flex-col md:relative md:z-auto md:w-[380px]"
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-300/30">
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-helm-400" />
                <span className="text-sm font-semibold text-white">Control Panel</span>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-colors md:hidden">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Live Activity */}
              <SectionHeader
                icon={<Activity className="w-3.5 h-3.5 text-helm-400" />}
                title="Live Activity"
                isOpen={expandedSection === 'activity'}
                onClick={() => toggle('activity')}
                badge={<Zap className="w-3 h-3 text-emerald-400 animate-pulse" />}
              />
              <AnimatePresence>
                {expandedSection === 'activity' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-2">
                      {DEMO_ACTIVITY.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-3 rounded-xl bg-surface-100/50 border border-surface-300/30 hover:border-surface-400/50 transition-all"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${LAYER_DOT[item.layer] || 'bg-surface-600'}`} />
                            <span className="text-xs font-medium text-white">{item.agent}</span>
                            <span className="text-[10px] text-surface-600 ml-auto">{item.time}</span>
                          </div>
                          <p className="text-xs text-surface-600 leading-relaxed">{item.action}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Approval Queue */}
              <SectionHeader
                icon={<Shield className="w-3.5 h-3.5 text-amber-400" />}
                title="Approval Queue"
                isOpen={expandedSection === 'approvals'}
                onClick={() => toggle('approvals')}
                badge={<span className="text-[10px] text-surface-600">0 pending</span>}
              />
              <AnimatePresence>
                {expandedSection === 'approvals' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3">
                      <div className="p-6 text-center text-surface-600 text-xs">
                        No pending approvals. Actions requiring your review will appear here.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Connectors */}
              <SectionHeader
                icon={<Plug className="w-3.5 h-3.5 text-emerald-400" />}
                title="Connectors"
                isOpen={expandedSection === 'connectors'}
                onClick={() => toggle('connectors')}
              />
              <AnimatePresence>
                {expandedSection === 'connectors' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-1.5">
                      {CONNECTORS.map((c, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-100/50 transition-colors"
                        >
                          <span className="text-xs text-white">{c.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            c.connected
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-surface-200 text-surface-600'
                          }`}>
                            {c.connected ? 'Connected' : 'Not connected'}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionHeader({
  icon,
  title,
  isOpen,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-100/30 transition-colors border-b border-surface-300/20"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold text-white">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-surface-600" />
        </motion.div>
      </div>
    </button>
  );
}
