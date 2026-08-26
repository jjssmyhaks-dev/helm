'use client';

import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  message?: string;
  steps?: string[];
}

export function ThinkingIndicator({ message = 'Analyzing...', steps = [] }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-surface-100 border border-surface-300/50 px-4 py-3">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => steps.length > 0 && setExpanded(!expanded)}>
        <div className="relative">
          <Brain className="w-4 h-4 text-helm-400" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-helm-400 animate-pulse" />
        </div>
        <span className="text-xs text-surface-600 flex-1">{message}</span>
        <div className="flex gap-1">
          <span className="w-1 h-1 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        {steps.length > 0 && (
          expanded ? <ChevronUp className="w-3 h-3 text-surface-600" /> : <ChevronDown className="w-3 h-3 text-surface-600" />
        )}
      </div>

      {expanded && steps.length > 0 && (
        <div className="mt-2 space-y-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-surface-600">
              <div className={`w-1.5 h-1.5 rounded-full ${i === steps.length - 1 ? 'bg-helm-400 animate-pulse' : 'bg-green-400'}`} />
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
