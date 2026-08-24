'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ActivityFeed } from './ActivityFeed';
import { ApprovalQueue } from './ApprovalQueue';
import { ConnectorsPanel } from './ConnectorsPanel';
import { ChevronDown, ChevronUp, Zap, Shield, Plug } from 'lucide-react';

interface Props { token: string; }
type PanelSection = 'activity' | 'approvals' | 'connectors';

export function SidePanel({ token }: Props) {
  const [expandedSection, setExpandedSection] = useState<PanelSection>('activity');
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => { api.setToken(token); }, [token]);

  useEffect(() => {
    const poll = async () => {
      try { const a = await api.getPendingApprovals(); setApprovalCount(a.length); } catch {}
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const toggle = (s: PanelSection) => setExpandedSection(expandedSection === s ? ('' as any) : s);

  const sections: { id: PanelSection; label: string; icon: any; badge?: number }[] = [
    { id: 'activity', label: 'Live Activity', icon: Zap },
    { id: 'approvals', label: 'Approval Queue', icon: Shield, badge: approvalCount },
    { id: 'connectors', label: 'Connectors', icon: Plug },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-0">
      <div className="px-4 py-3 border-b border-surface-300/50">
        <h3 className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Control Panel</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sections.map((s) => (
          <div key={s.id} className="border-b border-surface-300/30">
            <button onClick={() => toggle(s.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-200/50 transition-colors">
              <div className="flex items-center gap-2.5">
                <s.icon className="w-4 h-4 text-surface-600" />
                <span className="text-sm font-medium text-surface-800">{s.label}</span>
                {s.badge !== undefined && s.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-helm-500 text-white text-[10px] font-bold">{s.badge}</span>
                )}
              </div>
              {expandedSection === s.id ? <ChevronUp className="w-4 h-4 text-surface-600" /> : <ChevronDown className="w-4 h-4 text-surface-600" />}
            </button>
            {expandedSection === s.id && (
              <div className="px-4 pb-4">
                {s.id === 'activity' && <ActivityFeed token={token} />}
                {s.id === 'approvals' && <ApprovalQueue token={token} onApprovalChange={setApprovalCount} />}
                {s.id === 'connectors' && <ConnectorsPanel token={token} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
