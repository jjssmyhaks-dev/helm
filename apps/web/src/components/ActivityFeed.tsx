'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Clock, CheckCircle, AlertCircle, Loader2, Search } from 'lucide-react';

interface Props { token: string; }

const LAYER_COLORS: Record<string, string> = {
  RESEARCH: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  MARKETING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OPERATIONS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FINANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export function ActivityFeed({ token }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try { setActivities(await api.getRecentActivity(30)); } catch {} setLoading(false);
  };

  useEffect(() => {
    api.setToken(token);
    fetch();
    const i = setInterval(fetch, 5000);
    return () => clearInterval(i);
  }, [token]);

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 text-surface-600 animate-spin" /></div>;

  if (activities.length === 0) return (
    <div className="text-center py-6">
      <Search className="w-7 h-7 text-surface-400 mx-auto mb-2" />
      <p className="text-xs text-surface-600">No activity yet</p>
    </div>
  );

  return (
    <div className="space-y-1.5">
      {activities.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-200/30 transition-colors">
          <div className="mt-0.5">
            {a.action === 'task_completed' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> :
             a.action === 'task_failed' ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
             a.action === 'task_started' ? <Loader2 className="w-3.5 h-3.5 text-helm-400 animate-spin" /> :
             <Clock className="w-3.5 h-3.5 text-surface-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-surface-800 truncate">{a.agent?.name || 'System'}</span>
              {a.agent?.layer && (
                <span className={`text-[9px] px-1 py-0.5 rounded border font-medium ${LAYER_COLORS[a.agent.layer] || 'bg-surface-200 text-surface-600 border-surface-300'}`}>{a.agent.layer}</span>
              )}
            </div>
            <p className="text-[11px] text-surface-600 mt-0.5 truncate">{a.action.replace(/_/g, ' ')}</p>
          </div>
          <span className="text-[10px] text-surface-600 whitespace-nowrap tabular-nums">
            {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ))}
    </div>
  );
}
