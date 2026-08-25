'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
      <div className="max-w-md w-full mx-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.05))' }}
        >
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h1
          className="text-2xl font-semibold mb-3"
          style={{ color: '#fafafa', letterSpacing: '-0.02em' }}
        >
          Something went wrong
        </h1>

        <p className="mb-8" style={{ color: '#a1a1aa', lineHeight: 1.6 }}>
          {error.message || 'An unexpected error occurred. Our team has been notified.'}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary flex items-center gap-2"
            style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px' }}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/"
            className="btn-ghost flex items-center gap-2"
            style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px' }}
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs" style={{ color: '#52525b' }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
