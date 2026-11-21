'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Log In failed.');
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-navy-950 border border-medblue-400/30 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Student Log In</h1>
          <p className="text-sm text-blue-200/80">Access your revision analytics and saved AI study history</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1.5">
              Email or Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-blue-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-blue-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-medblue-500 hover:bg-medblue-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-xs text-blue-200/80">
          New to MedVault?{' '}
          <Link href="/register" className="text-medblue-400 font-semibold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
