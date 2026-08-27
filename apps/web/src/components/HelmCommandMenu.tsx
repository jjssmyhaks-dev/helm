'use client';

import {
  IconAnchor,
  IconBell,
  IconBolt,
  IconBrain,
  IconCalendar,
  IconChartBar,
  IconChartPie,
  IconClock,
  IconFileText,
  IconHelp,
  IconKeyboard,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconLogout,
  IconMail,
  IconMessage,
  IconPalette,
  IconSearch,
  IconSettings,
  IconSquareCheck,
  IconTarget,
  IconTrendingUp,
  IconUsers,
  IconWriting,
  IconCoin,
  IconAd,
  IconBrandGoogle,
  IconSeo,
  IconClipboardList,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';

const workspaceItems = [
  { icon: IconLayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: IconMessage, label: 'Chat', href: '/' },
  { icon: IconUsers, label: 'Leads', href: '/leads' },
  { icon: IconMail, label: 'Emails', href: '/emails' },
  { icon: IconLayoutKanban, label: 'Projects', href: '/projects' },
  { icon: IconSquareCheck, label: 'Tasks', href: '/tasks' },
  { icon: IconCalendar, label: 'Calendar', href: '/calendar' },
  { icon: IconFileText, label: 'Documents', href: '/documents' },
  { icon: IconBell, label: 'Notifications', href: '/notifications' },
  { icon: IconClock, label: 'Activity Log', href: '/activity' },
  { icon: IconTarget, label: 'Goals', href: '/goals' },
];

const agentItems = [
  { icon: IconBrain, label: 'General Orchestrator', desc: 'Routes to specialist agents' },
  { icon: IconWriting, label: 'Writing Agent', desc: 'Blog, email, social copy' },
  { icon: IconCoin, label: 'Finance Agent', desc: 'Cash flow, P&L, forecasting' },
  { icon: IconAd, label: 'Performance Marketing', desc: 'Campaigns, conversion, budgets' },
  { icon: IconAd, label: 'Meta Ads Agent', desc: 'Facebook & Instagram campaigns' },
  { icon: IconBrandGoogle, label: 'Google Ads Agent', desc: 'Search & display campaigns' },
  { icon: IconSeo, label: 'SEO Agent', desc: 'Keywords, on-page, technical SEO' },
  { icon: IconSearch, label: 'Research Agent', desc: 'Competitors, market trends' },
  { icon: IconClipboardList, label: 'Project Management', desc: 'Sprints, OKRs, planning' },
];

const analyticsItems = [
  { icon: IconChartBar, label: 'Performance Overview', href: '/dashboard' },
  { icon: IconTrendingUp, label: 'Growth Metrics', href: '/dashboard' },
  { icon: IconChartPie, label: 'Reports', href: '/dashboard' },
  { icon: IconBolt, label: 'Agent Insights', href: '/dashboard' },
];

const settingsItems = [
  { icon: IconSettings, label: 'Preferences', href: '/settings' },
  { icon: IconPalette, label: 'Appearance', href: '/settings' },
  { icon: IconKeyboard, label: 'Keyboard shortcuts', action: 'shortcuts' },
  { icon: IconHelp, label: 'Help & support', href: '/help' },
  { icon: IconLogout, label: 'Sign out', action: 'logout' },
];

interface HelmCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (href: string) => void;
  onAction?: (action: string) => void;
}

export function HelmCommandMenu({
  open,
  onOpenChange,
  onNavigate,
  onAction,
}: HelmCommandMenuProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (item: { href?: string; action?: string }) => {
    onOpenChange(false);
    if (item.href && onNavigate) onNavigate(item.href);
    if (item.action && onAction) onAction(item.action);
  };

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <Command>
        <CommandInput
          className="h-12"
          placeholder="Type a command or search..."
        />
        <CommandList className="h-[320px] max-h-[320px]">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Workspace">
            {workspaceItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect(item)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="AI Agents">
            {agentItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect({ action: `agent:${item.label}` })}
              >
                <item.icon className="mr-2 h-5 w-5" />
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.desc}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Analytics">
            {analyticsItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect(item)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings">
            {settingsItems.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => handleSelect(item)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>

        <div className="flex h-12 items-center justify-end border-t px-3">
          <button
            className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <span>Close</span>
            <Kbd className="ml-1">Esc</Kbd>
          </button>
        </div>
      </Command>
    </CommandDialog>
  );
}
