'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Anchor } from 'lucide-react';
import { AnimatedHero } from './AnimatedHero';
import { AnimatedFeatures } from './AnimatedFeatures';
import { AnimatedAgentGrid } from './AnimatedAgentGrid';
import { AnimatedHowItWorks } from './AnimatedHowItWorks';

export function LandingPage({ onGetStarted }: { onGetStarted?: () => void } = {}) {
  return (
    <div className="min-h-screen bg-surface-0 text-white overflow-hidden">
      {/* Animated Nav */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-surface-0/70 backdrop-blur-xl border-b border-surface-300/30"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, type: 'spring', damping: 20 }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center shadow-lg shadow-helm-500/20">
              <Anchor className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Helm</span>
          </motion.div>

          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            {onGetStarted ? (
              <>
                <button
                  onClick={onGetStarted}
                  className="text-sm text-surface-600 hover:text-white transition-colors font-medium px-4 py-2"
                >
                  Sign in
                </button>
                <button
                  onClick={onGetStarted}
                  className="text-sm font-medium bg-gradient-to-r from-helm-600 to-helm-500 text-white px-5 py-2.5 rounded-xl hover:from-helm-500 hover:to-helm-400 transition-all shadow-lg shadow-helm-500/20"
                >
                  Get started free
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-surface-600 hover:text-white transition-colors font-medium px-4 py-2"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm font-medium bg-gradient-to-r from-helm-600 to-helm-500 text-white px-5 py-2.5 rounded-xl hover:from-helm-500 hover:to-helm-400 transition-all shadow-lg shadow-helm-500/20"
                >
                  Get started free
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero */}
      <AnimatedHero onGetStarted={onGetStarted} />

      {/* Features */}
      <AnimatedFeatures />

      {/* Agent Grid */}
      <AnimatedAgentGrid />

      {/* How it Works + CTA */}
      <AnimatedHowItWorks onGetStarted={onGetStarted} />

      {/* Footer */}
      <motion.footer
        className="py-8 px-6 border-t border-surface-300/30"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center">
              <Anchor className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-surface-600">Helm</span>
          </div>
          <p className="text-xs text-surface-600">© 2025 Helm. AI Operating System for Solo Founders.</p>
        </div>
      </motion.footer>
    </div>
  );
}
