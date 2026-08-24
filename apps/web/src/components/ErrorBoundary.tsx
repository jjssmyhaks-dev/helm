'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Anchor, RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Helm Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-dark-400 mb-2 text-sm">
              Helm encountered an unexpected error. Don&apos;t worry — your data is safe.
            </p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-dark-500 text-xs cursor-pointer hover:text-dark-400">
                  Error details
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-dark-900 border border-dark-700 text-xs text-red-400 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-helm-600 text-white hover:bg-helm-700 transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-500 transition-colors text-sm font-medium"
              >
                <Anchor className="w-4 h-4" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
