'use client';

import { useState, useEffect } from 'react';
import { ChatPane } from '@/components/ChatPane';
import { SidePanel } from '@/components/SidePanel';
import { Onboarding } from '@/components/Onboarding';
import { CommandPalette } from '@/components/CommandPalette';
import { LandingPage } from '@/components/LandingPage';
import { useDemoAuth } from '@/components/Providers';
import { api } from '@/lib/api';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const CLERK_KEY_REGEX = /^pk_(test|live)_[A-Za-z0-9+/=_-]{20,}$/;
const clerkEnabled = CLERK_KEY_REGEX.test(clerkKey);

/**
 * DEMO MODE — used when Clerk key is invalid/missing
 */
function DemoHome() {
  const auth = useDemoAuth();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('helm_demo_user');
    if (stored) {
      api.setToken(stored);
      setShowLanding(false);
    }
  }, []);

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

  if (showLanding) {
    return (
      <LandingPage
        onGetStarted={() => {
          auth.signIn();
          const id = localStorage.getItem('helm_demo_user');
          if (id) api.setToken(id);
          setShowLanding(false);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPane
          token={auth.userId || 'demo-founder'}
          sessionId={activeSessionId}
          onSessionChange={setActiveSessionId}
          onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
          onLogout={() => {
            auth.signOut();
            setShowLanding(true);
          }}
        />
      </div>
      {sidePanelOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidePanelOpen(false)} />
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
        <SidePanel token={auth.userId || 'demo-founder'} />
      </div>
    </div>
  );
}

/**
 * CLERK MODE — full auth with Clerk (only rendered when key is valid)
 */
function ClerkHome() {
  // Import Clerk hooks at module level so they're called consistently
  const { useAuth, useUser } = require('@clerk/nextjs');
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const { user } = useUser();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.setToken(user.id);
      checkOnboarding();
    }
  }, [user]);

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <LandingPage />;
  }

  if (onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
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
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPane
          token={user?.id || ''}
          sessionId={activeSessionId}
          onSessionChange={setActiveSessionId}
          onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
          onLogout={() => signOut()}
        />
      </div>
      {sidePanelOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidePanelOpen(false)} />
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
    </div>
  );
}

/**
 * Root page — routes to demo or Clerk mode based on key validity
 */
export default function Home() {
  if (clerkEnabled) {
    return <ClerkHome />;
  }
  return <DemoHome />;
}
