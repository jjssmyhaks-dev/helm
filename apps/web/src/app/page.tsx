'use client';

import { useState, useEffect } from 'react';
import { ChatPane } from '@/components/ChatPane';
import { SidePanel } from '@/components/SidePanel';
import { AuthScreen } from '@/components/AuthScreen';
import { Onboarding } from '@/components/Onboarding';
import { api } from '@/lib/api';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('helm_token');
    if (saved) {
      setToken(saved);
      api.setToken(saved);
      checkOnboarding(saved);
    }
  }, []);

  const checkOnboarding = async (t: string) => {
    try {
      api.setToken(t);
      const state = await api.getOnboardingState();
      setOnboardingComplete(state.completed);
    } catch {
      setOnboardingComplete(true); // Skip onboarding check on error
    }
  };

  const handleAuth = (newToken: string) => {
    localStorage.setItem('helm_token', newToken);
    setToken(newToken);
    api.setToken(newToken);
    checkOnboarding(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('helm_token');
    setToken(null);
    setActiveSessionId(null);
    setOnboardingComplete(null);
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  // Not logged in
  if (!token) {
    return <AuthScreen onAuth={handleAuth} />;
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
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingComplete}
      />
    );
  }

  // Main app
  return (
    <div className="flex h-screen bg-dark-950">
      {/* Main Chat Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPane
          token={token}
          sessionId={activeSessionId}
          onSessionChange={setActiveSessionId}
          onToggleSidePanel={() => setSidePanelOpen(!sidePanelOpen)}
          onLogout={handleLogout}
        />
      </div>

      {/* Side Panel */}
      {sidePanelOpen && (
        <div className="w-[380px] border-l border-dark-700 flex flex-col bg-dark-900">
          <SidePanel token={token} />
        </div>
      )}
    </div>
  );
}
