'use client';

import { motion } from 'framer-motion';
import { Anchor } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-4"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-helm-500/20">
        <Anchor className="w-4 h-4 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-surface-700 mb-1.5">Helm</span>
        <div className="flex items-center gap-3 px-4 py-3 bg-surface-50 border border-surface-200 rounded-2xl rounded-bl-md">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-surface-400"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span className="text-xs text-surface-500">Thinking...</span>
        </div>
      </div>
    </motion.div>
  );
}
