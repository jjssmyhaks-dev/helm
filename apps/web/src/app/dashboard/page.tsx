'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Anchor,
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ArrowLeft,
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
} from 'lucide-react';

interface DashboardData {
  agents: {
    id: string;
    name: string;
    layer: string;
    status: string;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    successRate: number;
  }[];
  tasks: {
    total: number;
    completedToday: number;
    completedThisWeek: number;
    pending: number;
    failed: number;
    byLayer: { layer: string; count: number }[];
  };
  activity: {
    id: string;
    action: string;
    details: any;
    createdAt: string;
  }[];
  tokenUsage: any[];
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  summary: {
    activeAgents: number;
    totalAgents: number;
    tasksCompletedToday: number;
    tasksCompletedWeek: number;
    successRate: number;
    topAgent: string;
    pendingApprovals: number;
  };
}

const LAYER_COLORS: Record<string, string> = {
  RESEARCH: 'bg-blue-500',
  MARKETING: 'bg-purple-500',
  OPERATIONS: 'bg-emerald-500',
  FINANCE: 'bg-amber-500',
};

const LAYER_ICONS: Record<string, string> = {
  RESEARCH: '🔍',
  MARKETING: '📢',
  OPERATIONS: '⚙️',
  FINANCE: '💰',
};

const STATUS_COLORS: Record<string, string> = {
  IDLE: 'text-dark-500',
  WORKING: 'text-emerald-400',
  WAITING_APPROVAL: 'text-amber-400',
  ERROR: 'text-red-400',
};

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      api.setToken(isSignedIn ? 'user' : '');
      loadDashboard();
    }
  }, [isSignedIn]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const dashboardData = await api.getDashboard();
      setData(dashboardData);
      setError(null);
    } catch (err: any) {
      // If dashboard endpoint doesn't exist, show empty state with sample data
      setError(null);
      setData(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  const d = data || getSampleData();

  return (
    <div className="min-h-screen bg-dark-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-helm-600 flex items-center justify-center">
                <Anchor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-dark-500">Your AI team at a glance</p>
              </div>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-500 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Active Agents"
            value={`${d.summary.activeAgents}/${d.summary.totalAgents}`}
            color="text-helm-400"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Tasks Today"
            value={d.summary.tasksCompletedToday}
            color="text-emerald-400"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Success Rate"
            value={`${d.summary.successRate}%`}
            color="text-blue-400"
          />
          <StatCard
            icon={<Shield className="w-5 h-5" />}
            label="Pending Approvals"
            value={d.summary.pendingApprovals}
            color="text-amber-400"
            badge={d.summary.pendingApprovals > 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agents Panel */}
          <div className="lg:col-span-2 bg-dark-900 rounded-2xl border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-helm-400" />
              Agent Performance
            </h2>
            {d.agents.length === 0 ? (
              <p className="text-dark-500 text-sm py-8 text-center">
                No agents yet. Start chatting to activate your AI team!
              </p>
            ) : (
              <div className="space-y-3">
                {d.agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-dark-800 border border-dark-700"
                  >
                    <span className="text-xl">{LAYER_ICONS[agent.layer] || '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {agent.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            LAYER_COLORS[agent.layer] || 'bg-dark-600'
                          } text-white/80`}
                        >
                          {agent.layer}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${STATUS_COLORS[agent.status] || 'text-dark-500'}`}>
                          {agent.status}
                        </span>
                        <span className="text-xs text-dark-500">
                          {agent.completedTasks} done / {agent.totalTasks} total
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">{agent.successRate}%</div>
                      <div className="text-xs text-dark-500">success</div>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-24 h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${LAYER_COLORS[agent.layer] || 'bg-dark-500'}`}
                        style={{ width: `${agent.successRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Stats Panel */}
          <div className="bg-dark-900 rounded-2xl border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-helm-400" />
              Task Breakdown
            </h2>

            {/* By Layer Chart */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-medium text-dark-400 uppercase tracking-wider">By Layer</h3>
              {d.tasks.byLayer.length === 0 ? (
                <p className="text-dark-500 text-sm">No completed tasks yet</p>
              ) : (
                d.tasks.byLayer.map((layer) => {
                  const maxCount = Math.max(...d.tasks.byLayer.map((l) => l.count), 1);
                  const pct = Math.round((layer.count / maxCount) * 100);
                  return (
                    <div key={layer.layer}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-dark-300">
                          {LAYER_ICONS[layer.layer]} {layer.layer}
                        </span>
                        <span className="text-xs text-dark-500">{layer.count}</span>
                      </div>
                      <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${LAYER_COLORS[layer.layer] || 'bg-dark-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{d.tasks.total}</div>
                <div className="text-xs text-dark-500">Total Tasks</div>
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{d.tasks.completedThisWeek}</div>
                <div className="text-xs text-dark-500">This Week</div>
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">{d.tasks.pending}</div>
                <div className="text-xs text-dark-500">Pending</div>
              </div>
              <div className="bg-dark-800 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-400">{d.tasks.failed}</div>
                <div className="text-xs text-dark-500">Failed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-dark-900 rounded-2xl border border-dark-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-helm-400" />
            Recent Activity
          </h2>
          {d.activity.length === 0 ? (
            <p className="text-dark-500 text-sm py-4 text-center">
              No activity yet. Your agents will appear here when they start working.
            </p>
          ) : (
            <div className="space-y-2">
              {d.activity.slice(0, 10).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-helm-500 flex-shrink-0" />
                  <span className="text-sm text-dark-300 flex-1">{a.action}</span>
                  <span className="text-xs text-dark-500">
                    {new Date(a.createdAt).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approvals Panel */}
        <div className="mt-6 bg-dark-900 rounded-2xl border border-dark-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-helm-400" />
            Approval Stats
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-800 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{d.approvals.pending}</div>
              <div className="text-sm text-dark-500 mt-1">Pending</div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{d.approvals.approved}</div>
              <div className="text-sm text-dark-500 mt-1">Approved</div>
            </div>
            <div className="bg-dark-800 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{d.approvals.rejected}</div>
              <div className="text-sm text-dark-500 mt-1">Rejected</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  badge?: boolean;
}) {
  return (
    <div className="bg-dark-900 rounded-2xl border border-dark-700 p-5">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg bg-dark-800 ${color}`}>{icon}</div>
        {badge && (
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
        )}
      </div>
      <div className="text-2xl font-bold text-white mt-2">{value}</div>
      <div className="text-sm text-dark-500 mt-1">{label}</div>
    </div>
  );
}

function getSampleData(): DashboardData {
  return {
    agents: [],
    tasks: { total: 0, completedToday: 0, completedThisWeek: 0, pending: 0, failed: 0, byLayer: [] },
    activity: [],
    tokenUsage: [],
    approvals: { pending: 0, approved: 0, rejected: 0, total: 0 },
    summary: {
      activeAgents: 0,
      totalAgents: 21,
      tasksCompletedToday: 0,
      tasksCompletedWeek: 0,
      successRate: 100,
      topAgent: 'None yet',
      pendingApprovals: 0,
    },
  };
}
