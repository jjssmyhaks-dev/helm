'use client';

import { SignIn } from '@clerk/nextjs';
import { Anchor, AlertTriangle } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-helm-600 flex items-center justify-center">
              <Anchor className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Helm</h1>
          </div>
          <p className="text-dark-500 text-sm">
            AI Operating System for Solo Founders
          </p>
        </div>

        {/* Clerk SignIn component */}
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'bg-dark-900 border border-dark-700 shadow-xl',
                headerTitle: 'text-white',
                headerSubtitle: 'text-dark-400',
                socialButtonsBlockButton: 'bg-dark-800 border-dark-600 text-white hover:bg-dark-700',
                socialButtonsBlockButtonText: 'text-white font-medium',
                dividerLine: 'bg-dark-700',
                dividerText: 'text-dark-500',
                formFieldLabel: 'text-dark-400',
                formFieldInput: 'bg-dark-800 border-dark-600 text-white placeholder-dark-500',
                formButtonPrimary: 'bg-helm-600 hover:bg-helm-700 text-white',
                footerActionLink: 'text-helm-400 hover:text-helm-300',
              },
            }}
          />
        </div>

        {/* Google OAuth notice */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-300/80">
            <strong>Google sign-in:</strong> If clicking &quot;Continue with Google&quot; shows an error, use email/password instead. 
            Google OAuth can be enabled in the{' '}
            <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-200">
              Clerk Dashboard
            </a>{' '}
            → Configure → Social Connections.
          </div>
        </div>
      </div>
    </div>
  );
}
