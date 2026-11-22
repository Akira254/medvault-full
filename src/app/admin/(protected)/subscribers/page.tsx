'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface SubscriberItem {
  id: string;
  email: string;
  name?: string | null;
  status: string;
  source?: string | null;
  createdAt: string;
}

interface SummaryCounts {
  total: number;
  active: number;
  pending: number;
  unsubscribed: number;
}

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [summary, setSummary] = useState<SummaryCounts>({
    total: 0,
    active: 0,
    pending: 0,
    unsubscribed: 0,
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Announcement composer
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [sending, setSending] = useState(false);

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter, q: search });
      const res = await fetch(`/api/admin/subscribers?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load subscribers');
      setSubscribers(data.subscribers || []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error loading subscribers');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  async function handleStatusChange(id: string, nextStatus: 'active' | 'unsubscribed') {
    const res = await fetch('/api/admin/subscribers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: nextStatus }),
    });
    if (res.ok) {
      setFeedback(`Subscriber marked as ${nextStatus}.`);
      loadSubscribers();
    }
  }

  async function handleSendAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/subscribers/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue announcement');
      setSubject('');
      setMessage('');
      setFeedback(`Announcement queued for ${data.recipientCount} subscriber(s).`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error queueing announcement');
    } finally {
      setSending(false);
    }
  }

  function exportCsv() {
    const headers = ['Email', 'Name', 'Status', 'Source', 'Created At'];
    const lines = [
      headers.join(','),
      ...subscribers.map((s) =>
        [
          `"${(s.email || '').replace(/"/g, '""')}"`,
          `"${(s.name || '').replace(/"/g, '""')}"`,
          `"${s.status}"`,
          `"${s.source || ''}"`,
          `"${s.createdAt}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medvault-subscribers-${statusFilter.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Subscribers</h1>
          <p className="text-sm text-slate-600">
            Track double opt-in status, filter/export lists, unsubscribe users, and send revision announcements.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total</div>
          <div className="mt-1 text-2xl font-bold text-[#0B1F3A]">{summary.total}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Active</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{summary.active}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Pending Opt-In</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{summary.pending}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Unsubscribed</div>
          <div className="mt-1 text-2xl font-bold text-slate-600">{summary.unsubscribed}</div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {feedback}
        </div>
      )}

      {/* Filters + Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['ALL', 'ACTIVE', 'PENDING', 'UNSUBSCRIBED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium ${
                  statusFilter === st
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, name, or source..."
            className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No subscribers match this filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-4 font-medium">{s.email}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{s.name || '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{s.source || 'web'}</td>
                    <td className="py-2.5 text-right space-x-2">
                      {s.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(s.id, 'active')}
                          className="rounded border border-emerald-200 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                        >
                          Activate
                        </button>
                      )}
                      {s.status !== 'unsubscribed' && (
                        <button
                          onClick={() => handleStatusChange(s.id, 'unsubscribed')}
                          className="rounded border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Unsubscribe
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Queue Announcement */}
      <form
        onSubmit={handleSendAnnouncement}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
      >
        <h2 className="text-base font-semibold text-[#0B1F3A]">Send / Queue Announcement</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Announcement subject"
            className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as 'ACTIVE' | 'ALL')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ACTIVE">Active Subscribers Only</option>
            <option value="ALL">All Subscribers</option>
          </select>
        </div>
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write update message for subscribers..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          disabled={sending}
          type="submit"
          className="rounded-lg bg-[#2F80C9] px-4 py-2 text-sm font-medium text-white hover:bg-[#123A66] disabled:opacity-50"
        >
          {sending ? 'Queueing...' : 'Queue Announcement'}
        </button>
      </form>
    </div>
  );
}