'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import {
  Anchor,
  BarChart3,
  Settings,
  MessageSquare,
  Search,
  Plus,
  Filter,
  ArrowUpRight,
  User,
  Building2,
  Star,
  ChevronRight,
  Upload,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';

interface Lead {
  id: string;
  name: string;
  email?: string;
  company?: string;
  title?: string;
  source?: string;
  status: string;
  score?: number;
  tags: string[];
  lastContactedAt?: string;
  createdAt: string;
  notes?: string;
  scoreHistory?: Array<{ overallScore: number }>;
}

interface PipelineStats {
  pipeline: Array<{
    status: string;
    count: number;
    avgScore: number;
    percentage: number;
  }>;
  total: number;
  avgScore: number;
  conversionRate: number;
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'MEETING', 'PROPOSAL', 'CLOSED_WON', 'CLOSED_LOST'];
const STAGE_COLORS: Record<string, string> = {
  NEW: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
  CONTACTED: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30',
  QUALIFIED: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30',
  MEETING: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30',
  PROPOSAL: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30',
  CLOSED_WON: 'from-green-500/20 to-green-600/10 text-green-400 border-green-500/30',
  CLOSED_LOST: 'from-red-500/20 to-red-600/10 text-red-400 border-red-500/30',
};

export default function LeadsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) api.setToken(token);
      const [leadsData, statsData] = await Promise.all([
        api.request<Lead[]>('GET', '/leads'),
        api.request<PipelineStats>('GET', '/leads/pipeline'),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredLeads = leads.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.toLowerCase().includes(search.toLowerCase()) ||
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getLeadsByStage = (stage: string) =>
    filteredLeads.filter((l) => l.status === stage);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await api.request('PATCH', `/leads/${leadId}`, { status: newStatus });
      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const handleImport = async () => {
    try {
      const lines = importText.split('\n').filter((l) => l.trim());
      const importedLeads = lines.map((line) => {
        const [name, email, company, title] = line.split(',').map((s) => s.trim());
        return { name, email, company, title, source: 'import' };
      });
      await api.request('POST', '/leads/import', { leads: importedLeads });
      setShowImport(false);
      setImportText('');
      loadData();
    } catch (err) {
      console.error('Failed to import leads:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-helm-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface-300/50 bg-surface-0/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-helm-500 to-helm-600 flex items-center justify-center">
              <Anchor className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-white text-sm">Leads</span>
              <span className="text-[11px] text-surface-600 ml-2">Pipeline Management</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-9 pr-4 py-2 rounded-xl bg-surface-100 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30 w-64"
            />
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-200 text-surface-700 hover:text-white hover:bg-surface-300 transition-all text-sm"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>
          <NotificationBell token="" />
          <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="px-6 py-4 border-b border-surface-300/30">
          <div className="flex items-center gap-6">
            <div className="glass-card px-4 py-2 rounded-xl">
              <div className="text-xs text-surface-600">Total Leads</div>
              <div className="text-lg font-bold text-white">{stats.total}</div>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl">
              <div className="text-xs text-surface-600">Avg Score</div>
              <div className="text-lg font-bold text-white">{Math.round(stats.avgScore)}</div>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl">
              <div className="text-xs text-surface-600">Conversion</div>
              <div className="text-lg font-bold text-white">{stats.conversionRate}%</div>
            </div>
            {stats.pipeline.map((stage) => (
              <div key={stage.status} className="text-center">
                <div className="text-[10px] text-surface-600 uppercase">{stage.status.replace('_', ' ')}</div>
                <div className="text-sm font-semibold text-white">{stage.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 p-6 overflow-x-auto h-[calc(100vh-180px)]">
        {STAGES.filter((s) => s !== 'CLOSED_LOST').map((stage) => (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 bg-gradient-to-r ${STAGE_COLORS[stage]} border`}>
              <span className="text-xs font-semibold uppercase tracking-wider">{stage.replace('_', ' ')}</span>
              <span className="text-xs opacity-70">{getLeadsByStage(stage).length}</span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {getLeadsByStage(stage).map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className="glass-card rounded-xl p-3 cursor-pointer hover:border-surface-400 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-surface-200 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-surface-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{lead.name}</div>
                        {lead.company && (
                          <div className="flex items-center gap-1 text-xs text-surface-600">
                            <Building2 className="w-3 h-3" />
                            {lead.company}
                          </div>
                        )}
                      </div>
                    </div>
                    {lead.score != null && (
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        lead.score >= 70 ? 'bg-green-500/20 text-green-400' :
                        lead.score >= 40 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {lead.score}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-surface-600 px-2 py-0.5 rounded-full bg-surface-200">
                      {lead.source || 'Unknown'}
                    </span>
                    {lead.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] text-surface-600 px-2 py-0.5 rounded-full bg-surface-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {/* Move buttons */}
                  <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {stage !== 'NEW' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = STAGES.indexOf(stage);
                          if (idx > 0) updateLeadStatus(lead.id, STAGES[idx - 1]);
                        }}
                        className="text-[10px] text-surface-600 hover:text-white px-2 py-0.5 rounded bg-surface-200 hover:bg-surface-300"
                      >
                        ← Back
                      </button>
                    )}
                    {stage !== 'CLOSED_WON' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const idx = STAGES.indexOf(stage);
                          if (idx < STAGES.length - 1) updateLeadStatus(lead.id, STAGES[idx + 1]);
                        }}
                        className="text-[10px] text-helm-400 hover:text-white px-2 py-0.5 rounded bg-helm-500/20 hover:bg-helm-500/30"
                      >
                        Advance →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {getLeadsByStage(stage).length === 0 && (
                <div className="text-center py-8 text-surface-600 text-xs">
                  No leads in this stage
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Detail Slide-over */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <div className="relative w-96 bg-surface-100 border-l border-surface-300 overflow-y-auto animate-slide-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">{selectedLead.name}</h2>
                <button onClick={() => setSelectedLead(null)} className="text-surface-600 hover:text-white">✕</button>
              </div>

              <div className="space-y-4">
                <div className="glass-card rounded-xl p-4">
                  <div className="text-xs text-surface-600 mb-2">Score</div>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-white">{selectedLead.score ?? '—'}</div>
                    <div className="flex-1 h-2 bg-surface-300 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-helm-500 to-helm-400 rounded-full"
                        style={{ width: `${selectedLead.score || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-surface-600" />
                    <span className="text-surface-700">{selectedLead.company || 'No company'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-surface-600">📧</span>
                    <span className="text-surface-700">{selectedLead.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-surface-600">💼</span>
                    <span className="text-surface-700">{selectedLead.title || 'No title'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-surface-600">🔗</span>
                    <span className="text-surface-700">{selectedLead.source || 'Unknown source'}</span>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4">
                  <div className="text-xs text-surface-600 mb-2">Status</div>
                  <select
                    value={selectedLead.status}
                    onChange={async (e) => {
                      await updateLeadStatus(selectedLead.id, e.target.value);
                      setSelectedLead({ ...selectedLead, status: e.target.value });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="glass-card rounded-xl p-4">
                  <div className="text-xs text-surface-600 mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedLead.tags.map((tag) => (
                      <span key={tag} className="text-xs text-surface-700 px-2 py-0.5 rounded-full bg-surface-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedLead.notes && (
                  <div className="glass-card rounded-xl p-4">
                    <div className="text-xs text-surface-600 mb-2">Notes</div>
                    <div className="text-sm text-surface-700 whitespace-pre-wrap">{selectedLead.notes}</div>
                  </div>
                )}

                <button className="w-full btn-primary py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Score & Suggest Next Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <div className="relative w-[500px] glass-card rounded-2xl p-6 shadow-elevated">
            <h3 className="text-lg font-bold text-white mb-4">Import Leads (CSV)</h3>
            <p className="text-sm text-surface-600 mb-4">
              Paste CSV data: name, email, company, title (one per line)
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="John Doe, john@acme.com, Acme Inc, CEO&#10;Jane Smith, jane@globex.com, Globex, CTO"
              rows={8}
              className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-surface-300 text-white placeholder-surface-600 text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30 resize-none font-mono"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowImport(false)}
                className="flex-1 py-2.5 rounded-xl btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="flex-1 py-2.5 rounded-xl btn-primary text-sm disabled:opacity-30"
              >
                Import {importText.split('\n').filter((l) => l.trim()).length} Leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
