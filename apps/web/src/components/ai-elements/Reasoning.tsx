'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Brain } from 'lucide-react';

interface Props {
  content: string;
  duration?: number;
  isStreaming?: boolean;
}

export function Reasoning({ content, duration, isStreaming = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  if (!content && !isStreaming) return null;

  return (
    <div className="my-2">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-surface-500 hover:text-surface-700 hover:bg-surface-100 transition-colors"
        whileHover={{ scale: 1.01 }}
      >
        <Brain className="w-3.5 h-3.5" />
        <span className="font-medium">
          {isStreaming ? 'Thinking...' : 'Reasoned for ' + (duration ? `${duration}s` : 'a moment')}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-4 px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 text-xs text-surface-600 leading-relaxed whitespace-pre-wrap">
              {content}
              {isStreaming && (
                <motion.span
                  className="inline-block w-0.5 h-3 bg-surface-400 ml-0.5 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
