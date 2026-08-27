'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  role: 'founder' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

export function AnimatedMessage({ role, content, createdAt }: Props) {
  const isFounder = role === 'founder';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`flex gap-3 ${isFounder ? 'justify-end' : 'justify-start'}`}
    >
      {!isFounder && (
        <motion.div
          className="w-7 h-7 rounded-lg bg-gradient-to-br from-helm-500/20 to-helm-600/10 border border-helm-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          <Bot className="w-3.5 h-3.5 text-helm-400" />
        </motion.div>
      )}

      <div className={`max-w-[80%] ${isFounder ? 'order-first' : ''}`}>
        <motion.div
          className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
            isFounder
              ? 'bg-gradient-to-r from-helm-600 to-helm-500 text-white rounded-br-md shadow-lg shadow-helm-500/15'
              : role === 'agent'
              ? 'bg-surface-100 border border-surface-300/50 text-surface-800 rounded-bl-md'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
          layout
        >
          {role === 'agent' ? (
            <MarkdownRenderer content={content} />
          ) : (
            <span className="whitespace-pre-wrap">{content}</span>
          )}
        </motion.div>
        <div className={`text-[10px] text-surface-600 mt-1 ${isFounder ? 'text-right' : 'text-left'} px-1`}>
          {new Date(createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isFounder && (
        <motion.div
          className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center flex-shrink-0 mt-0.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          <span className="text-white text-[10px] font-semibold">You</span>
        </motion.div>
      )}
    </motion.div>
  );
}
