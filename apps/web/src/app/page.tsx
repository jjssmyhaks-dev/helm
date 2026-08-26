'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { ChatPane } from '@/components/ChatPane';
import { SidePanel } from '@/components/SidePanel';
import { Onboarding } from '@/components/Onboarding';
import { CommandPalette } from '@/components/CommandPalette';
import { api } from '@/lib/api';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  useEffect(() => {
    if (isSignedIn && user) {
      api.setToken(user.id);
      checkOnboarding();
    }
  }, [isSignedIn, user]);

  // Global Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkOnboarding = async () => {
    try {
      const state = await api.getOnboardingState();
      setOnboardingComplete(state.completed);
    } catch {
      setOnboardingComplete(true);
    }
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <p className="text-dark-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  if (onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboardingComplete) {
    return (
      <Onboarding
        onComplete={() => setOnboardingComplete(true)}
        onSkip={() => setOnboardingComplete(true)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      {/* Command Palette */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPane
          token={user?.id || ''}
          sessionId={activeSessionId}
          onSessionChange={setActiveSessionId}
          onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
          onLogout={() => {}}
        />
      </div>

      {/* Side Panel */}
      <>
        {sidePanelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidePanelOpen(false)}
          />
        )}
        <div
          className={`
            fixed inset-y-0 right-0 z-50 w-[340px] bg-surface-100 border-l border-surface-300/50
            transform transition-transform duration-300 ease-in-out
            ${sidePanelOpen ? 'translate-x-0' : 'translate-x-full'}
            md:relative md:translate-x-0 md:z-auto md:w-[380px]
            ${!sidePanelOpen ? 'md:hidden' : ''}
          `}
        >
          <SidePanel token={user?.id || ''} />
        </div>
      </>
    </div>
  );
}
