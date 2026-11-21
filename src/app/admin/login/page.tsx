'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, totpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Admin authentication failed.');
      } else {
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-neon-frame flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#11151C] border border-[#2A3342] rounded-xl overflow-hidden shadow-2xl">
        {/* Red-to-Green Diagonal Split Banner (Section 7A) */}
        <div className="admin-banner-split p-5 flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 shrink-0" />
          <div>
            <h1 className="text-lg font-extrabold tracking-wide uppercase">
              MedVault Restricted Admin Portal
            </h1>
            <p className="text-xs opacity-90">
              Strict session-only access • Fresh authentication required every visit
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {reason === 'expired' && (
            <div className="admin-banner-danger p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Warning: Admin session timed out (10m idle / 60m max). Log in again.</span>
            </div>
          )}

          {error && (
            <div className="admin-banner-danger p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Error: {error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                Admin Email *
              </label>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D12] border border-gray-700 text-white text-sm focus:outline-none focus:border-[#39FF14]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                Admin Username *
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D12] border border-gray-700 text-white text-sm focus:outline-none focus:border-[#39FF14]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D12] border border-gray-700 text-white text-sm focus:outline-none focus:border-[#39FF14]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">
                2FA TOTP Code (if enabled)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0A0D12] border border-gray-700 text-white text-sm focus:outline-none focus:border-[#39FF14]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#0E8A3E] hover:bg-[#0B7A36] text-white font-bold text-sm uppercase tracking-wider transition-colors"
            >
              {loading ? 'Authenticating...' : 'Authenticate Admin Session'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading login...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}