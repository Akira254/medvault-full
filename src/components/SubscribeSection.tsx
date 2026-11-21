'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export function SubscribeSection({
  source = 'homepage',
  compact = false,
}: {
  source?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, website: honeypot, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Could not process subscription.');
      } else {
        setStatus('success');
        setMessage(data.message || 'Check your inbox to confirm your subscription.');
        setEmail('');
        setName('');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label="Subscribe to MedVault updates">
      {/* Honeypot anti-spam field */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
      />

      <div className={compact ? 'flex flex-col sm:flex-row gap-2' : 'grid sm:grid-cols-3 gap-3'}>
        {!compact && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            aria-label="Your name"
            className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200/70 focus:outline-none focus:ring-2 focus:ring-medblue-400 text-sm"
          />
        )}
        <div className={`relative ${compact ? 'flex-1' : 'sm:col-span-1'}`}>
          <Mail className="w-4 h-4 text-blue-200/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            aria-label="Email address"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-blue-200/70 focus:outline-none focus:ring-2 focus:ring-medblue-400 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-6 py-3 rounded-xl bg-medblue-500 hover:bg-medblue-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors shrink-0"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </div>

      <p className="text-xs text-blue-200/75">
        Double opt-in enabled. You will receive a confirmation link and can unsubscribe in one click anytime.
      </p>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-300 bg-red-950/60 border border-red-500/40 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
    </form>
  );
}
