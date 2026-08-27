'use client';

import { motion } from 'framer-motion';
import { Anchor, ArrowRight, Bot, Shield, Zap, BarChart3, Globe, Sparkles, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 100 },
  },
};

const floatVariants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

const FEATURES = [
  { icon: Bot, label: '21 Specialist AI Agents', desc: 'Across 4 functional layers' },
  { icon: Shield, label: 'Risk-Tiered Autonomy', desc: 'You control what agents can do' },
  { icon: Zap, label: 'Continuous Operation', desc: 'Runs 24/7, not just on-demand' },
  { icon: BarChart3, label: 'Real-Time Intelligence', desc: 'Live data feeds & analytics' },
];

export function AnimatedHero({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-40 right-0 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(34,211,238,0.06) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        className="max-w-4xl mx-auto text-center relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-100 border border-surface-300/50 text-xs text-surface-600 mb-8">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          Now in early access — 100% free during beta
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6"
        >
          <span className="block">Your AI team</span>
          <motion.span
            className="block bg-gradient-to-r from-helm-400 via-violet-400 to-helm-400 bg-[length:200%_auto] bg-clip-text text-transparent"
            animate={{ backgroundPosition: ['0% center', '200% center'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            for every function.
          </motion.span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-surface-600 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Replace hiring 4 departments with one AI platform. Research, marketing, operations,
          and finance — all coordinated by 21 specialist agents that work 24/7.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 mb-12">
          {onGetStarted ? (
            <motion.button
              onClick={onGetStarted}
              className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold shadow-xl shadow-helm-500/25 hover:shadow-2xl hover:shadow-helm-500/35 transition-all duration-300 text-base"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start for free
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </motion.button>
          ) : (
            <Link
              href="/sign-up"
              className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-helm-600 to-helm-500 text-white font-semibold shadow-xl shadow-helm-500/25 hover:shadow-2xl hover:shadow-helm-500/35 transition-all duration-300 text-base"
            >
              Start for free
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.span>
            </Link>
          )}
          <a
            href="#features"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-surface-300 text-surface-700 hover:text-white hover:border-surface-400 hover:bg-surface-100/50 transition-all duration-300 text-base"
          >
            See how it works
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-6 text-xs text-surface-600">
          {['No credit card required', 'Setup in 2 minutes', 'Cancel anytime'].map((text, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              {text}
            </span>
          ))}
        </motion.div>

        {/* Feature pills */}
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-3 mt-10">
          {[
            { icon: Bot, text: '21 AI Agents' },
            { icon: Globe, text: '22+ Integrations' },
            { icon: Shield, text: 'Risk-Tiered Autonomy' },
            { icon: Zap, text: '24/7 Operation' },
          ].map((f, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100/50 border border-surface-300/30 text-xs text-surface-700"
              whileHover={{ scale: 1.05, borderColor: 'rgba(99,102,241,0.3)' }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <f.icon className="w-3 h-3 text-helm-400" />
              {f.text}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
