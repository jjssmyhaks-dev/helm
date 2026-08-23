'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Clock, CheckCircle, AlertCircle, Loader2, Search } from 'lucide-react';

interface Props {
  token: string;
}

const LAYER_COLORS: Record<string, string> = {
  research: 'bg-blue-500/20 text-blue-400',
  marketing: 'bg-purple-500/20 text-purple-400',
  operations: 'bg-green-500/20 text-green-400',
  finance: 'bg-amber-500/20 text-amber-400',
};

export function ActivityFeed({ token }: Props) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const data = await api.getRecentActivity(30);
      setActivities(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    api.setToken(token);
    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-dark-500 animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <Search className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-sm text-dark-500">No activity yet</p>
        <p className="text-xs text-dark-600 mt-1">
          Agents will appear here once they start working
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-2.5 rounded-lg bg-dark-800/50 border border-dark-700/50"
        >
          <div className="mt-0.5">
            {activity.action === 'task_completed' ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : activity.action === 'task_failed' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : activity.action === 'task_started' ? (
              <Loader2 className="w-4 h-4 text-helm-400 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 text-dark-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-dark-200 truncate">
                {activity.agent?.name || 'Unknown'}
              </span>
              {activity.agent?.layer && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    LAYER_COLORS[activity.agent.layer.toLowerCase()] || 'bg-dark-700 text-dark-400'
                  }`}
                >
                  {activity.agent.layer}
                </span>
              )}
            </div>
            <p className="text-xs text-dark-400 mt-0.5 truncate">
              {activity.action.replace(/_/g, ' ')}
            </p>
          </div>
          <span className="text-[10px] text-dark-600 whitespace-nowrap">
            {new Date(activity.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
