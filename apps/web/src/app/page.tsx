'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { ChatPane } from '@/components/ChatPane';
import { SidePanel } from '@/components/SidePanel';
import { Onboarding } from '@/components/Onboarding';
import { api } from '@/lib/api';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (isSignedIn && user) {
      // Set the token for API calls (Clerk session token)
      api.setToken(user.id);
      checkOnboarding();
    }
  }, [isSignedIn, user]);

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

  // Not signed in — Clerk handles redirect
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <p className="text-dark-400">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Loading onboarding state
  if (onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show onboarding for new founders
  if (!onboardingComplete) {
    return (
      <Onboarding
        onComplete={() => setOnboardingComplete(true)}
        onSkip={() => setOnboardingComplete(true)}
      />
    );
  }

  // Main app
  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
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

      {/* Side Panel — slide-over on mobile, fixed on desktop */}
      <>
        {sidePanelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidePanelOpen(false)}
          />
        )}
        <div
          className={`
            fixed inset-y-0 right-0 z-50 w-[340px] bg-dark-900 border-l border-dark-700
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
