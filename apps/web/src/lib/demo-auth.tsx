'use client';

/**
 * Demo auth context — used when Clerk is unavailable (invalid key).
 * Provides the same interface as useAuth/useUser from Clerk so components
 * can work in both modes without conditional imports.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoAuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
  sessionId: string | null;
  signIn: () => void;
  signUp: () => void;
  signOut: () => void;
}

const DemoAuthContext = createContext<DemoAuthContextType>({
  isSignedIn: false,
  isLoaded: false,
  userId: null,
  sessionId: null,
  signIn: () => {},
  signUp: () => {},
  signOut: () => {},
});

export function useDemoAuth() {
  return useContext(DemoAuthContext);
}

const DEMO_USER_KEY = 'helm_demo_user';

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check for existing demo session
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) {
      setUserId(stored);
    }
    setIsLoaded(true);
  }, []);

  const signIn = () => {
    const id = `demo-user-${Date.now()}`;
    localStorage.setItem(DEMO_USER_KEY, id);
    setUserId(id);
  };

  const signUp = () => signIn();

  const signOut = () => {
    localStorage.removeItem(DEMO_USER_KEY);
    setUserId(null);
  };

  return (
    <DemoAuthContext.Provider
      value={{
        isSignedIn: !!userId,
        isLoaded,
        userId,
        sessionId: userId ? `session-${userId}` : null,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </DemoAuthContext.Provider>
  );
}
