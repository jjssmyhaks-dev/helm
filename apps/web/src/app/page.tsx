'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatPane } from '@/components/ChatPane';
import { SidePanel } from '@/components/SidePanel';
import { AuthScreen } from '@/components/AuthScreen';
import { api } from '@/lib/api';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('helm_token');
    if (saved) setToken(saved);
  }, []);

  const handleAuth = (newToken: string) => {
    localStorage.setItem('helm_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('helm_token');
    setToken(null);
    setActiveSessionId(null);
  };

  if (!token) {
    return <AuthScreen onAuth={handleAuth} />;
  }

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
