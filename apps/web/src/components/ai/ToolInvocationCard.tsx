'use client';

import { useState } from 'react';
import { Plug, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolInvocation {
  toolName: string;
  status: 'running' | 'complete' | 'error';
  input?: Record<string, unknown>;
  output?: string | Record<string, unknown> | null;
  error?: string;
}

export function ToolInvocationCard({ invocation }: { invocation: ToolInvocation }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    running: { icon: Loader2, color: 'text-helm-400', bg: 'bg-helm-500/10 border-helm-500/20', spin: true },
    complete: { icon: Check, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', spin: false },
    error: { icon: X, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', spin: false },
  };

  const config = statusConfig[invocation.status];
  const StatusIcon = config.icon;

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${config.bg} transition-all`}>
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Plug className={`w-3.5 h-3.5 ${config.color}`} />
        <span className="text-xs font-medium text-white flex-1">{invocation.toolName}</span>
        <StatusIcon className={`w-3.5 h-3.5 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-surface-600" />
        ) : (
          <ChevronDown className="w-3 h-3 text-surface-600" />
        )}
      </div>

      {expanded && (
        <div className="mt-2 space-y-2 text-xs">
          {invocation.input && Object.keys(invocation.input).length > 0 && (
            <div>
              <div className="text-[10px] text-surface-600 uppercase mb-0.5">Input</div>
              <pre className="text-surface-700 bg-surface-200 rounded-lg p-2 overflow-x-auto font-mono text-[11px]">
                {JSON.stringify(invocation.input, null, 2)}
              </pre>
            </div>
          )}
          {invocation.output && (
            <div>
              <div className="text-[10px] text-surface-600 uppercase mb-0.5">Output</div>
              <pre className="text-surface-700 bg-surface-200 rounded-lg p-2 overflow-x-auto font-mono text-[11px]">{String(typeof invocation.output === 'string'
                  ? invocation.output
                  : JSON.stringify(invocation.output ?? null, null, 2))}</pre>
            </div>
          )}
          {invocation.error && (
            <div className="text-red-400 bg-red-500/10 rounded-lg p-2">{invocation.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
