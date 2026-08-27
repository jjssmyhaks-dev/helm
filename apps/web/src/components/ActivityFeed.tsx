'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { Clock, CheckCircle, AlertCircle, Loader2, Search, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { token: string; }

const LAYER_COLORS: Record<string, string> = {
  RESEARCH: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  MARKETING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  OPERATIONS: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FINANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

interface ActivityEvent {
  type: 'activity' | 'agent_status' | 'task_update';
  data: any;
  timestamp: string;
}

export function ActivityFeed({ token }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInitial = useCallback(async () => {
    try {
      const data = await api.getRecentActivity(30);
      setActivities(data);
    } catch {}
    setLoading(false);
  }, []);

  // SSE connection with auto-reconnect
  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    const url = `${baseUrl.replace('/api', '')}/activity/stream`;

    try {
      const es = new EventSource(`${url}?token=${token}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data: ActivityEvent = JSON.parse(event.data);
          if (data.type === 'activity' && data.data) {
            setActivities((prev) => {
              const newActivities = [data.data, ...prev].slice(0, 50);
              return newActivities;
            });
          } else if (data.type === 'agent_status' && data.data) {
            // Could update agent status indicators
          }
        } catch {}
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        eventSourceRef.current = null;
        // Retry after 5s
        retryTimeoutRef.current = setTimeout(connectSSE, 5000);
      };
    } catch {
      // SSE not supported or URL invalid, fall back to polling
      setConnected(false);
    }
  }, [token]);

  useEffect(() => {
    api.setToken(token);
    fetchInitial();
    connectSSE();

    // Polling fallback every 10s in case SSE disconnects
    const pollInterval = setInterval(() => {
      if (!connected) {
        fetchInitial();
      }
    }, 10000);

    return () => {
      eventSourceRef.current?.close();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      clearInterval(pollInterval);
    };
  }, [token, fetchInitial, connectSSE, connected]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-4 h-4 text-surface-600 animate-spin" />
    </div>
  );

  if (activities.length === 0) return (
    <div className="text-center py-6">
      <Search className="w-7 h-7 text-surface-400 mx-auto mb-2" />
      <p className="text-xs text-surface-600">No activity yet</p>
      <p className="text-[10px] text-surface-500 mt-1">Agents will appear here when they start working</p>
    </div>
  );

  return (
    <div>
      {/* Connection status indicator */}
      <div className="flex items-center gap-1.5 mb-2 px-1">
        {connected ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-500">
            <Wifi className="w-3 h-3" /> Live
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-surface-500">
            <WifiOff className="w-3 h-3" /> Polling
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {activities.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-surface-200/30 transition-colors"
            >
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
