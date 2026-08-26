'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  Plug,
  Search,
  Anchor,
  Bot,
  Zap,
  X,
  Users,
  Mail,
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const NAVIGATION_ITEMS = [
  { id: 'chat', label: 'Go to Chat', icon: MessageSquare, shortcut: '⌘1', action: '/' },
  { id: 'dashboard', label: 'Go to Dashboard', icon: BarChart3, shortcut: '⌘2', action: '/dashboard' },
  { id: 'leads', label: 'Go to Leads', icon: Users, shortcut: '⌘3', action: '/leads' },
  { id: 'emails', label: 'Go to Emails', icon: Mail, shortcut: '⌘4', action: '/emails' },
  { id: 'settings', label: 'Go to Settings', icon: Settings, shortcut: '⌘5', action: '/settings' },
];

const AGENT_ITEMS = [
  { id: 'research', label: 'Research Team', icon: Search, layer: 'RESEARCH' },
  { id: 'marketing', label: 'Marketing Team', icon: Bot, layer: 'MARKETING' },
  { id: 'operations', label: 'Operations Team', icon: Zap, layer: 'OPERATIONS' },
  { id: 'finance', label: 'Finance Team', icon: Shield, layer: 'FINANCE' },
];

const QUICK_ACTIONS = [
  { id: 'campaign', label: 'Create Marketing Campaign', query: 'Create a marketing campaign for my product' },
  { id: 'cashflow', label: 'Analyze Cash Flow', query: 'Analyze my cash flow and give me a report' },
  { id: 'competitors', label: 'Research Competitors', query: 'Research my top competitors' },
  { id: 'tax', label: 'Check Tax Obligations', query: 'What are my tax obligations?' },
  { id: 'support', label: 'View Support Tickets', query: 'Show me recent support tickets' },
  { id: 'pricing', label: 'Pricing Benchmark', query: 'Benchmark my pricing against competitors' },
  { id: 'leads-stats', label: 'Lead Pipeline Stats', query: 'Show me my lead pipeline stats' },
  { id: 'draft-email', label: 'Draft an Email', query: 'Draft a professional email to a lead' },
];

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Handled by parent
        }
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleQuery = (query: string) => {
    router.push(`/?q=${encodeURIComponent(query)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <Command
          className="bg-surface-100 border border-surface-300 rounded-2xl shadow-2xl overflow-hidden"
          loop
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-300/50">
            <Search className="w-5 h-5 text-surface-600" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search commands, pages, or ask a question..."
              className="flex-1 bg-transparent text-white placeholder-surface-600 outline-none text-sm"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-200 text-surface-600 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="text-center py-8 text-surface-600 text-sm">
              No results found.
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="text-xs text-surface-600 font-medium mb-1">
              {NAVIGATION_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => handleNavigate(item.action)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm text-surface-700 hover:bg-surface-200 hover:text-white transition-colors group"
                >
                  <item.icon className="w-4 h-4 text-surface-600 group-hover:text-helm-400" />
                  <span className="flex-1">{item.label}</span>
                  <kbd className="text-xs text-surface-600 bg-surface-200 px-1.5 py-0.5 rounded font-mono">
                    {item.shortcut}
                  </kbd>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-2 border-t border-surface-300/50" />

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="text-xs text-surface-600 font-medium mb-1">
              {QUICK_ACTIONS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => handleQuery(item.query)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm text-surface-700 hover:bg-surface-200 hover:text-white transition-colors group"
                >
                  <Anchor className="w-4 h-4 text-surface-600 group-hover:text-helm-400" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-xs text-surface-600">→</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Separator className="my-2 border-t border-surface-300/50" />

            {/* Agent Teams */}
            <Command.Group heading="Agent Teams" className="text-xs text-surface-600 font-medium mb-1">
              {AGENT_ITEMS.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => handleQuery(`Tell me about the ${item.layer} team`)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-sm text-surface-700 hover:bg-surface-200 hover:text-white transition-colors group"
                >
                  <item.icon className="w-4 h-4 text-surface-600 group-hover:text-helm-400" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-xs text-surface-600 bg-surface-200 px-1.5 py-0.5 rounded">
                    {item.layer}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-300/50 text-xs text-surface-600">
            <span>↑↓ Navigate · ↵ Select · esc Close</span>
            <span className="flex items-center gap-1">
              <Anchor className="w-3 h-3" />
              Helm
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
