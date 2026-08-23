'use client';

import { useState, useEffect } from 'react';
import { ChatPane } from '@/components/ChatPane';
import { SidePanel } from '@/components/SidePanel';
import { AuthScreen } from '@/components/AuthScreen';
import { Onboarding } from '@/components/Onboarding';
import { api } from '@/lib/api';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
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
      setOnboardingComplete(true);
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

  if (!token) return <AuthScreen onAuth={handleAuth} />;

  if (onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-8 h-8 border-2 border-helm-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={() => setOnboardingComplete(true)} onSkip={() => setOnboardingComplete(true)} />;
  }

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
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

      {/* Side Panel — slide-over on mobile, fixed on desktop */}
      <>
        {/* Backdrop on mobile */}
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
          <SidePanel token={token} />
        </div>
      </>
    </div>
  );
}
