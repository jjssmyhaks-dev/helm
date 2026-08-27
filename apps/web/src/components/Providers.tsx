'use client';

import { ReactNode, createContext, useContext, useState, useEffect } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/nextjs';

/**
 * Check if the Clerk publishable key is actually valid
 * (proper pk_test_ or pk_live_ format with valid base64 domain)
 */
function isClerkKeyValid(): boolean {
  if (typeof window === 'undefined') {
    // Server side — check env
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
    return /^pk_(test|live)_[A-Za-z0-9+/=_-]{20,}$/.test(key);
  }
  // Client side — check window.__CLERK_PUBLISHABLE_KEY or meta tag
  const meta = document.querySelector('meta[name="clerk-publishable-key"]');
  const key = meta?.getAttribute('content') || (window as any).__NEXT_DATA__?.props?.pageProps?.__clerk_publishable_key || '';
  // If no meta/data, check env via window
  return /^pk_(test|live)_[A-Za-z0-9+/=_-]{20,}$/.test(key);
}

/**
 * Demo auth context — provides auth-like interface without Clerk
 */
interface AuthUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  emailAddresses: Array<{ emailAddress: string }>;
}

interface AuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: AuthUser | null;
  userId: string | null;
  signIn: () => void;
  signUp: () => void;
  signOut: () => void;
}

const DemoAuthContext = createContext<AuthContextType>({
  isSignedIn: false,
  isLoaded: false,
  user: null,
  userId: null,
  signIn: () => {},
  signUp: () => {},
  signOut: () => {},
});

export function useDemoAuth() {
  return useContext(DemoAuthContext);
}

const DEMO_USER_KEY = 'helm_demo_user';

function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) setUserId(stored);
    setIsLoaded(true);
  }, []);

  const user = userId ? {
    id: userId,
    firstName: 'Demo',
    lastName: 'Founder',
    imageUrl: '',
    emailAddresses: [{ emailAddress: 'demo@helm.ai' }],
  } : null;

  return (
    <DemoAuthContext.Provider
      value={{
        isSignedIn: !!userId,
        isLoaded,
        user,
        userId,
        signIn: () => {
          const id = `demo-founder-${Date.now()}`;
          localStorage.setItem(DEMO_USER_KEY, id);
          setUserId(id);
        },
        signUp: () => {
          const id = `demo-founder-${Date.now()}`;
          localStorage.setItem(DEMO_USER_KEY, id);
          setUserId(id);
        },
        signOut: () => {
          localStorage.removeItem(DEMO_USER_KEY);
          setUserId(null);
        },
      }}
    >
      {children}
    </DemoAuthContext.Provider>
  );
}

/**
 * Main Providers wrapper — uses Clerk when key is valid, demo mode otherwise
 */
export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  const keyValid = /^pk_(test|live)_[A-Za-z0-9+/=_-]{20,}$/.test(clerkKey);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR, always use demo provider to avoid hydration issues
  if (!mounted) {
    return <DemoAuthProvider>{children}</DemoAuthProvider>;
  }

  if (keyValid) {
    return (
      <ClerkProvider publishableKey={clerkKey}>
        {children}
      </ClerkProvider>
    );
  }

  return <DemoAuthProvider>{children}</DemoAuthProvider>;
}
