'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordValid) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
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
          <h1 className="text-2xl font-bold text-white">Create Student Account</h1>
          <p className="text-sm text-blue-200/80">Track MCQ accuracy, study streaks, and AI revision notes</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              Username * (3–30 chars: letters, numbers, _ or .)
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_.]+"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              Password * (minimum 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
            />
            <p className={`mt-1 text-xs flex items-center gap-1 ${passwordValid ? 'text-emerald-400' : 'text-blue-200/70'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{passwordValid ? 'Password meets minimum length (8+ characters)' : 'Must be at least 8 characters'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
              Confirm Password (optional)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-navy-900 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-medblue-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-medblue-500 hover:bg-medblue-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-xs text-blue-200/80">
          Already have an account?{' '}
          <Link href="/login" className="text-medblue-400 font-semibold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
