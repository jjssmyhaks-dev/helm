'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Anchor, ArrowLeft, Bot, CheckCircle2, Shield, TrendingUp,
  Activity, BarChart3, Users, Zap, Clock, Target,
} from 'lucide-react';

interface DashboardData {
  agents: { id: string; name: string; layer: string; status: string; totalTasks: number; completedTasks: number; failedTasks: number; successRate: number; }[];
  tasks: { total: number; completedToday: number; completedThisWeek: number; pending: number; failed: number; byLayer: { layer: string; count: number }[]; };
  activity: { id: string; action: string; details: any; createdAt: string; }[];
  tokenUsage: any[];
  approvals: { pending: number; approved: number; rejected: number; total: number; };
  summary: { activeAgents: number; totalAgents: number; tasksCompletedToday: number; tasksCompletedWeek: number; successRate: number; topAgent: string; pendingApprovals: number; };
}

const LAYER_COLORS: Record<string, string> = { RESEARCH: 'from-blue-500 to-blue-600', MARKETING: 'from-purple-500 to-purple-600', OPERATIONS: 'from-emerald-500 to-emerald-600', FINANCE: 'from-amber-500 to-amber-600' };
const LAYER_ICONS: Record<string, string> = { RESEARCH: '🔍', MARKETING: '📢', OPERATIONS: '⚙️', FINANCE: '💰' };
const STATUS_DOT: Record<string, string> = { IDLE: 'bg-surface-600', WORKING: 'bg-emerald-400', WAITING_APPROVAL: 'bg-amber-400', ERROR: 'bg-red-400' };

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (isSignedIn) loadDashboard(); }, [isSignedIn]);

  const loadDashboard = async () => {
    try { setLoading(true); const d = await api.getDashboard(); setData(d); } catch { setData(getSampleData()); } finally { setLoading(false); }
  };

  if (!isLoaded || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0">
      <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isSignedIn) { router.push('/sign-in'); return null; }

  const d = data || getSampleData();

  return (
    <div className="min-h-screen bg-surface-0 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/')} className="p-2 rounded-xl hover:bg-surface-200 text-surface-600 hover:text-white transition-all duration-150">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-sm text-surface-600">Your AI team at a glance</p>
            </div>
          </div>
          <button onClick={loadDashboard} className="btn-ghost text-sm">Refresh</button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users className="w-5 h-5" />} label="Active Agents" value={`${d.summary.activeAgents}/${d.summary.totalAgents}`} gradient="from-helm-500/10 to-helm-600/5" iconColor="text-helm-400" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Completed Today" value={d.summary.tasksCompletedToday} gradient="from-emerald-500/10 to-emerald-600/5" iconColor="text-emerald-400" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Success Rate" value={`${d.summary.successRate}%`} gradient="from-blue-500/10 to-blue-600/5" iconColor="text-blue-400" />
          <StatCard icon={<Shield className="w-5 h-5" />} label="Pending Approvals" value={d.summary.pendingApprovals} gradient="from-amber-500/10 to-amber-600/5" iconColor="text-amber-400" badge={d.summary.pendingApprovals > 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Agents */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bot className="w-4 h-4 text-helm-400" />
              Agent Performance
            </h2>
            {d.agents.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-10 h-10 text-surface-400 mx-auto mb-3" />
                <p className="text-surface-600 text-sm">No agents yet. Start chatting to activate your team.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {d.agents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-4 p-3 rounded-xl bg-surface-100/50 border border-surface-300/30 hover:bg-surface-200/50 transition-all duration-150">
                    <div className="text-lg">{LAYER_ICONS[agent.layer] || '🤖'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gradient-to-r ${LAYER_COLORS[agent.layer] || 'from-surface-500 to-surface-600'} text-white`}>{agent.layer}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[agent.status] || 'bg-surface-600'}`} />
                        <span className="text-[11px] text-surface-600">{agent.status} · {agent.completedTasks}/{agent.totalTasks} tasks</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{agent.successRate}<span className="text-xs text-surface-600">%</span></div>
                    </div>
                    <div className="w-20 h-1.5 bg-surface-300/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${LAYER_COLORS[agent.layer] || 'from-surface-500 to-surface-600'}`} style={{ width: `${agent.successRate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task Stats */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-helm-400" />
              Task Breakdown
            </h2>
            <div className="space-y-3 mb-6">
              {d.tasks.byLayer.length === 0 ? (
                <p className="text-surface-600 text-sm text-center py-4">No completed tasks yet</p>
              ) : d.tasks.byLayer.map((layer) => {
                const max = Math.max(...d.tasks.byLayer.map((l) => l.count), 1);
                return (
                  <div key={layer.layer}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-surface-700 font-medium">{LAYER_ICONS[layer.layer]} {layer.layer}</span>
                      <span className="text-xs text-surface-600">{layer.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-300/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${LAYER_COLORS[layer.layer] || ''}`} style={{ width: `${(layer.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Total', value: d.tasks.total, color: 'text-white' },
                { label: 'This Week', value: d.tasks.completedThisWeek, color: 'text-emerald-400' },
                { label: 'Pending', value: d.tasks.pending, color: 'text-amber-400' },
                { label: 'Failed', value: d.tasks.failed, color: 'text-red-400' },
              ].map((s) => (
                <div key={s.label} className="bg-surface-100/50 rounded-xl p-3 text-center border border-surface-300/30">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-surface-600 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity */}
        <div className="mt-5 glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-helm-400" />
            Recent Activity
          </h2>
          {d.activity.length === 0 ? (
            <p className="text-surface-600 text-sm text-center py-6">No activity yet. Your agents will appear here when they start working.</p>
          ) : (
            <div className="space-y-1">
              {d.activity.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-200/30 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-helm-500 flex-shrink-0" />
                  <span className="text-sm text-surface-700 flex-1">{a.action}</span>
                  <span className="text-xs text-surface-600 tabular-nums">
                    {new Date(a.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approvals */}
        <div className="mt-5 glass-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-surface-600 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-helm-400" />
            Approval Stats
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pending', value: d.approvals.pending, color: 'text-amber-400' },
              { label: 'Approved', value: d.approvals.approved, color: 'text-emerald-400' },
              { label: 'Rejected', value: d.approvals.rejected, color: 'text-red-400' },
            ].map((s) => (
              <div key={s.label} className="bg-surface-100/50 rounded-xl p-4 text-center border border-surface-300/30">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-surface-600 mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, gradient, iconColor, badge }: { icon: React.ReactNode; label: string; value: string | number; gradient: string; iconColor: string; badge?: boolean; }) {
  return (
    <div className="glass-card rounded-2xl p-5 hover:shadow-glow transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient}`}>
          <div className={iconColor}>{icon}</div>
        </div>
        {badge && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-surface-600 mt-1 font-medium">{label}</div>
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
    summary: { activeAgents: 0, totalAgents: 21, tasksCompletedToday: 0, tasksCompletedWeek: 0, successRate: 100, topAgent: 'None yet', pendingApprovals: 0 },
  };
}
