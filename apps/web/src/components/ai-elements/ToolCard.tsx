'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle, Wrench } from 'lucide-react';

interface Props {
  name: string;
  description?: string;
  status: 'running' | 'complete' | 'error';
  result?: string;
}

const STATUS_CONFIG = {
  running: { icon: Loader2, color: 'text-helm-500', bg: 'bg-helm-50', border: 'border-helm-200', spin: true },
  complete: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', spin: false },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', spin: false },
};

export function ToolCard({ name, description, status, result }: Props) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`my-1.5 inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${config.bg} ${config.border} text-xs max-w-full`}
    >
      <motion.div animate={config.spin ? { rotate: 360 } : {}} transition={config.spin ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
        <Icon className={`w-3.5 h-3.5 ${config.color} flex-shrink-0 ${config.spin ? 'animate-spin' : ''}`} />
      </motion.div>
      <div className="flex items-center gap-1.5 min-w-0">
        <Wrench className="w-3 h-3 text-surface-400 flex-shrink-0" />
        <span className="font-medium text-surface-700 truncate">{name}</span>
        {description && (
          <span className="text-surface-500 truncate hidden sm:inline">— {description}</span>
        )}
      </div>
      {result && status === 'complete' && (
        <span className="text-surface-500 truncate max-w-[200px]">{result}</span>
      )}
    </motion.div>
  );
}
