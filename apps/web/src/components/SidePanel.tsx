'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { ActivityFeed } from './ActivityFeed';
import { ApprovalQueue } from './ApprovalQueue';
import { ConnectorsPanel } from './ConnectorsPanel';
import { ChevronDown, ChevronUp, Zap, Shield, Plug } from 'lucide-react';

interface Props {
  token: string;
}

type PanelSection = 'activity' | 'approvals' | 'connectors';

export function SidePanel({ token }: Props) {
  const [expandedSection, setExpandedSection] = useState<PanelSection>('activity');
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    api.setToken(token);
  }, [token]);

  // Poll for approval count
  useEffect(() => {
    const poll = async () => {
      try {
        const approvals = await api.getPendingApprovals();
        setApprovalCount(approvals.length);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const toggleSection = (section: PanelSection) => {
    setExpandedSection(expandedSection === section ? '' as any : section);
  };

  const sections: { id: PanelSection; label: string; icon: any; badge?: number }[] = [
    { id: 'activity', label: 'Live Activity', icon: Zap },
    { id: 'approvals', label: 'Approval Queue', icon: Shield, badge: approvalCount },
    { id: 'connectors', label: 'Connectors', icon: Plug },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-dark-700">
        <h3 className="text-sm font-semibold text-white">Helm Control Panel</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.id} className="border-b border-dark-700">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <section.icon className="w-4 h-4 text-dark-400" />
                <span className="text-sm font-medium text-dark-200">{section.label}</span>
                {section.badge !== undefined && section.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-helm-600 text-white text-xs font-medium">
                    {section.badge}
                  </span>
                )}
              </div>
              {expandedSection === section.id ? (
                <ChevronUp className="w-4 h-4 text-dark-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-dark-500" />
              )}
            </button>

            {/* Section content */}
            {expandedSection === section.id && (
              <div className="px-4 pb-4">
                {section.id === 'activity' && <ActivityFeed token={token} />}
                {section.id === 'approvals' && (
                  <ApprovalQueue token={token} onApprovalChange={setApprovalCount} />
                )}
                {section.id === 'connectors' && <ConnectorsPanel token={token} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
