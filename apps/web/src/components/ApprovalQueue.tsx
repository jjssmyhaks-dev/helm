'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Shield,
  Check,
  X,
  Pencil,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface Props {
  token: string;
  onApprovalChange: (count: number) => void;
}

export function ApprovalQueue({ token, onApprovalChange }: Props) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data);
      onApprovalChange(data.length);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    api.setToken(token);
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleApprove = async (id: string) => {
    setActing(id);
    try {
      await api.approveAction(id);
      await fetchApprovals();
    } catch {}
    setActing(null);
  };

  const handleReject = async (id: string) => {
    setActing(id);
    try {
      await api.rejectAction(id);
      await fetchApprovals();
    } catch {}
    setActing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-dark-500 animate-spin" />
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-6">
        <Shield className="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p className="text-sm text-dark-500">All clear</p>
        <p className="text-xs text-dark-600 mt-1">
          No actions pending your approval
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="approval-card rounded-xl bg-dark-800 border border-amber-500/20 p-4"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              Approval Required
            </span>
            <span className="text-[10px] text-dark-500 ml-auto">
              {approval.agent?.name}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-dark-200 mb-2">
            {approval.actionDescription}
          </p>

          {/* Reasoning */}
          {approval.reasoning && (
            <div className="mb-3 p-2 rounded-lg bg-dark-900/50 border border-dark-700/50">
              <p className="text-xs text-dark-400 leading-relaxed">
                {approval.reasoning}
              </p>
            </div>
          )}

          {/* Layer badge */}
          {approval.agent?.layer && (
            <span className="text-[10px] text-dark-500">
              Layer: {approval.agent.layer}
            </span>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => handleApprove(approval.id)}
              disabled={acting === approval.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {acting === approval.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Approve
            </button>
            <button
              onClick={() => handleReject(approval.id)}
              disabled={acting === approval.id}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
