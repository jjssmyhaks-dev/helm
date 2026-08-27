'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

const STEPS = [
  { step: '1', title: 'Sign up & tell us about your business', description: 'A 5-question onboarding gives Helm context about your startup, market, and goals.' },
  { step: '2', title: 'Connect your tools', description: 'One-click OAuth to Google, Meta, Slack, Tally, and 18 more integrations.' },
  { step: '3', title: 'Helm gets to work', description: 'Agents start scanning, monitoring, and preparing insights immediately.' },
  { step: '4', title: 'Chat or use voice to direct your team', description: 'Ask anything. Helm routes to the right specialist and streams the response.' },
];

export function AnimatedHowItWorks({ onGetStarted }: { onGetStarted?: () => void }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Up and running in minutes
          </h2>
          <p className="text-surface-600 text-lg">
            No complex setup. No config files. Just sign up and start talking to your team.
          </p>
        </motion.div>

        <div className="space-y-5">
          {STEPS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15, type: 'spring', damping: 20 }}
              className="flex items-start gap-5 p-5 rounded-2xl bg-surface-100/50 border border-surface-300/50 hover:border-surface-400/50 hover:bg-surface-100/80 transition-all duration-300"
            >
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-helm-600 to-helm-500 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-lg shadow-helm-500/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                {item.step}
              </motion.div>
              <div>
                <h3 className="text-base font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-surface-600 leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="mt-20 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="relative p-10 rounded-3xl bg-gradient-to-br from-helm-900/40 via-surface-100/80 to-surface-100/80 border border-helm-500/15 overflow-hidden">
            {/* Animated glow */}
            <motion.div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.1), transparent 70%)' }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to hire your AI team?
              </h2>
              <p className="text-surface-600 text-base mb-8 max-w-md mx-auto">
                Join the beta and get access to 21 specialist agents, 22+ integrations, and continuous operation — all free.
              </p>
              {onGetStarted ? (
                <motion.button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold shadow-xl shadow-helm-500/25 hover:shadow-2xl hover:shadow-helm-500/35 transition-all text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get started free
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <a
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold shadow-xl shadow-helm-500/25 hover:shadow-2xl hover:shadow-helm-500/35 transition-all text-base"
                >
                  Get started free
                  <ChevronRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
