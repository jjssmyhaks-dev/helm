'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import {
  Anchor,
  BarChart3,
  Settings,
  MessageSquare,
  Plus,
  Send,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  Mail,
  Search,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NotificationBell } from '@/components/NotificationBell';
import { UserButton } from '@clerk/nextjs';

interface EmailDraft {
  id: string;
  category: string;
  to: string;
  subject: string;
  body: string;
  tonality: string;
  status: string;
  createdAt: string;
  lead?: { name: string; company: string } | null;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  tonality: string;
  usageCount: number;
}

interface EmailStats {
  sentByCategory: Array<{ category: string; count: number }>;
  draftsByStatus: Array<{ status: string; count: number }>;
  totalSent: number;
  totalDrafts: number;
}

const CATEGORIES = ['LEAD', 'VENDOR', 'PARTNER', 'VC', 'CUSTOMER', 'GENERAL'] as const;
const TONALITY_MAP: Record<string, string> = {
  professional: 'Clear, respectful, business-appropriate',
  formal: 'Highly professional, structured',
  friendly: 'Warm, casual, relationship-focused',
  assertive: 'Direct, confident, action-oriented',
  empathetic: 'Understanding, patient, solution-focused',
  concise: 'Ultra-brief, bullet-point driven',
};

export default function EmailsPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'compose' | 'drafts' | 'templates' | 'sent'>('compose');
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [category, setCategory] = useState<string>('LEAD');
  const [to, setTo] = useState('');
  const [subjectHint, setSubjectHint] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [tonality, setTonality] = useState('professional');
  const [drafting, setDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) api.setToken(token);
      const [draftsData, templatesData, statsData] = await Promise.all([
        api.request<EmailDraft[]>('GET', '/emails/drafts'),
        api.request<EmailTemplate[]>('GET', '/emails/templates'),
        api.request<EmailStats>('GET', '/emails/stats'),
      ]);
      setDrafts(draftsData);
      setTemplates(templatesData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDraft = async () => {
    setDrafting(true);
    try {
      const result = await api.request<any>('POST', '/emails/draft', {
        category,
        to,
        subject: subjectHint || undefined,
        keyPoints: keyPoints.split(',').map((p) => p.trim()).filter(Boolean),
        tonality,
        additionalContext: keyPoints,
      });
      setDraftResult(result);
      loadData();
    } catch (err) {
      console.error('Draft failed:', err);
    } finally {
      setDrafting(false);
    }
  };

  const handleApprove = async (draftId: string) => {
    try {
      await api.request('POST', `/emails/draft/${draftId}/approve`);
      loadData();
    } catch (err) {
      console.error('Approve failed:', err);
    }
  };

  const handleSend = async (draftId: string) => {
    try {
      await api.request('POST', `/emails/draft/${draftId}/send`);
      loadData();
    } catch (err) {
      console.error('Send failed:', err);
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
              <span className="font-semibold text-white text-sm">Emails</span>
              <span className="text-[11px] text-surface-600 ml-2">AI Email Agent</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button onClick={() => router.push('/settings')} className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-all">
            <Settings className="w-4 h-4" />
          </button>
          <NotificationBell token="" />
          <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
        </div>
      </header>

      {/* Stats */}
      {stats && (
        <div className="px-6 py-4 border-b border-surface-300/30">
          <div className="flex items-center gap-6">
            <div className="glass-card px-4 py-2 rounded-xl">
              <div className="text-xs text-surface-600">Total Sent</div>
              <div className="text-lg font-bold text-white">{stats.totalSent}</div>
            </div>
            <div className="glass-card px-4 py-2 rounded-xl">
              <div className="text-xs text-surface-600">Drafts</div>
              <div className="text-lg font-bold text-white">{stats.totalDrafts}</div>
            </div>
            {stats.sentByCategory.map((s) => (
              <div key={s.category} className="text-center">
                <div className="text-[10px] text-surface-600 uppercase">{s.category}</div>
                <div className="text-sm font-semibold text-white">{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 py-3 border-b border-surface-300/30">
        <div className="flex gap-1">
          {[
            { key: 'compose', label: 'Compose', icon: Sparkles },
            { key: 'drafts', label: 'Drafts', icon: FileText },
            { key: 'templates', label: 'Templates', icon: Mail },
            { key: 'sent', label: 'Sent', icon: Send },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                activeTab === key
                  ? 'bg-helm-500/20 text-helm-400 border border-helm-500/30'
                  : 'text-surface-600 hover:text-white hover:bg-surface-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto">
        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-helm-400" />
                AI Email Composer
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-surface-600 mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-surface-600 mb-1 block">Tonality</label>
                  <select
                    value={tonality}
                    onChange={(e) => setTonality(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30"
                  >
                    {Object.entries(TONALITY_MAP).map(([key, desc]) => (
                      <option key={key} value={key}>{key} — {desc}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-surface-600 mb-1 block">To</label>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@email.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs text-surface-600 mb-1 block">Subject (hint)</label>
                <input
                  value={subjectHint}
                  onChange={(e) => setSubjectHint(e.target.value)}
                  placeholder="What's the email about?"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30"
                />
              </div>

              <div className="mb-4">
                <label className="text-xs text-surface-600 mb-1 block">Key Points (comma-separated)</label>
                <textarea
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  placeholder="Follow up on demo, mention pricing, schedule call"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-200 border border-surface-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-helm-500/30 resize-none"
                />
              </div>

              <button
                onClick={handleDraft}
                disabled={drafting || (!to && !keyPoints)}
                className="w-full btn-primary py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-30"
              >
                {drafting ? (
                  <>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    Drafting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Draft
                  </>
                )}
              </button>
            </div>

            {/* Draft Result */}
            {draftResult && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Draft Generated</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-helm-500/20 text-helm-400">{draftResult.draft.category}</span>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-surface-600">To</div>
                  <div className="text-sm text-white">{draftResult.draft.to || 'Not specified'}</div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-surface-600">Subject</div>
                  <div className="text-sm text-white font-medium">{draftResult.draft.subject}</div>
                </div>
                <div className="mb-3">
                  <div className="text-xs text-surface-600">Tonality</div>
                  <div className="text-sm text-white">{draftResult.draft.tonality}</div>
                </div>
                <div className="mb-4">
                  <div className="text-xs text-surface-600 mb-1">Body</div>
                  <div className="text-sm text-surface-700 whitespace-pre-wrap bg-surface-200 rounded-xl p-4 font-mono leading-relaxed">
                    {draftResult.draft.body}
                  </div>
                </div>
                {draftResult.suggestions?.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-surface-600 mb-1">💡 Suggestions</div>
                    {draftResult.suggestions.map((s: string, i: number) => (
                      <div key={i} className="text-sm text-surface-700 bg-surface-200 rounded-lg p-2 mt-1">• {s}</div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(draftResult.draft.id)}
                    className="flex-1 py-2.5 rounded-xl btn-ghost text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleSend(draftResult.draft.id)}
                    className="flex-1 py-2.5 rounded-xl btn-primary text-sm flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="space-y-3">
            {drafts.length === 0 ? (
              <div className="text-center py-12 text-surface-600">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No drafts yet. Compose your first email!</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <div key={draft.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{draft.subject}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        draft.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                        draft.status === 'SENT' ? 'bg-blue-500/20 text-blue-400' :
                        draft.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                        'bg-surface-200 text-surface-600'
                      }`}>
                        {draft.status}
                      </span>
                    </div>
                    <div className="text-xs text-surface-600 mt-1">
                      To: {draft.to} • {draft.category} • {draft.tonality}
                    </div>
                    <div className="text-xs text-surface-600 mt-0.5 truncate max-w-md">
                      {draft.body.slice(0, 100)}...
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {draft.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleApprove(draft.id)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSend(draft.id)}
                          className="p-2 rounded-lg bg-helm-500/20 text-helm-400 hover:bg-helm-500/30 transition-all"
                          title="Send"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {draft.status === 'APPROVED' && (
                      <button
                        onClick={() => handleSend(draft.id)}
                        className="p-2 rounded-lg bg-helm-500/20 text-helm-400 hover:bg-helm-500/30 transition-all"
                        title="Send"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-surface-600">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No templates yet. Templates are auto-created from sent emails.</p>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-white">{template.name}</div>
                      <div className="text-xs text-surface-600 mt-1">
                        {template.category} • {template.tonality} • Used {template.usageCount} times
                      </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Sent Tab */}
        {activeTab === 'sent' && (
          <div className="text-center py-12 text-surface-600">
            <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Sent emails will appear here after you send drafts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
