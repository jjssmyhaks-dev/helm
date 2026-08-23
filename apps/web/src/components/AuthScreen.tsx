'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Anchor, Loader2 } from 'lucide-react';

interface Props {
  onAuth: (token: string) => void;
}

export function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    businessName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result =
        mode === 'login'
          ? await api.login({ email: form.email, password: form.password })
          : await api.signup({
              email: form.email,
              password: form.password,
              name: form.name,
              businessName: form.businessName,
            });
      api.setToken(result.token);
      onAuth(result.token);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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

        {/* Form */}
        <div className="bg-dark-900 rounded-2xl border border-dark-700 p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-dark-400 mb-1.5">
                    Your name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-dark-500 focus:outline-none focus:border-helm-500 focus:ring-1 focus:ring-helm-500"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-400 mb-1.5">
                    Business name
                  </label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-dark-500 focus:outline-none focus:border-helm-500 focus:ring-1 focus:ring-helm-500"
                    placeholder="Acme Inc"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-dark-500 focus:outline-none focus:border-helm-500 focus:ring-1 focus:ring-helm-500"
                placeholder="jane@acme.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-dark-500 focus:outline-none focus:border-helm-500 focus:ring-1 focus:ring-helm-500"
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-helm-600 hover:bg-helm-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-dark-400 hover:text-helm-400 transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
