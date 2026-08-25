import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';
import './sentry.client.config';

export const metadata: Metadata = {
  title: 'Helm — AI Operating System for Solo Founders',
  description: 'Your AI-powered virtual team. Research, marketing, operations, and finance — all coordinated.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster
            position="top-right"
            richColors
            closeButton
            theme="dark"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                border: '1px solid #2d2d44',
                color: '#e2e8f0',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
