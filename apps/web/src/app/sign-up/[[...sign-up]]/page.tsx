'use client';

import { SignUp } from '@clerk/nextjs';
import { Anchor } from 'lucide-react';

export default function SignUpPage() {
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

        {/* Clerk SignUp component */}
        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
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
      </div>
    </div>
  );
}
