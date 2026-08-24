'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Shield, Check, X, Loader2, AlertTriangle } from 'lucide-react';

interface Props { token: string; onApprovalChange: (count: number) => void; }

export function ApprovalQueue({ token, onApprovalChange }: Props) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetch = async () => {
    try { const d = await api.getPendingApprovals(); setApprovals(d); onApprovalChange(d.length); } catch {} setLoading(false);
  };

  useEffect(() => {
    api.setToken(token); fetch();
    const i = setInterval(fetch, 8000);
    return () => clearInterval(i);
  }, [token]);

  const approve = async (id: string) => { setActing(id); try { await api.approveAction(id); await fetch(); } catch {} setActing(null); };
  const reject = async (id: string) => { setActing(id); try { await api.rejectAction(id); await fetch(); } catch {} setActing(null); };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 text-surface-600 animate-spin" /></div>;

  if (approvals.length === 0) return (
    <div className="text-center py-6">
      <Shield className="w-7 h-7 text-surface-400 mx-auto mb-2" />
      <p className="text-xs text-surface-600">All clear — no pending approvals</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {approvals.map((a) => (
        <div key={a.id} className="approval-card rounded-xl bg-surface-100/50 border border-amber-500/20 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400">Approval Required</span>
            <span className="text-[10px] text-surface-600 ml-auto">{a.agent?.name}</span>
          </div>
          <p className="text-xs text-surface-800 mb-1.5">{a.actionDescription || a.actionType}</p>
          {a.reasoning && <p className="text-[11px] text-surface-600 mb-2 leading-relaxed">{a.reasoning}</p>}
          <div className="flex gap-1.5">
            <button onClick={() => approve(a.id)} disabled={acting === a.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-50">
              {acting === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
            </button>
            <button onClick={() => reject(a.id)} disabled={acting === a.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50">
              <X className="w-3 h-3" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
