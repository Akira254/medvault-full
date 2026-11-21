'use client';

import React, { useEffect, useState } from 'react';

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<any[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadFeedback() {
    const res = await fetch('/api/admin/feedback');
    if (res.ok) {
      const data = await res.json();
      setItems(data.feedbacks || []);
    }
  }

  useEffect(() => {
    loadFeedback();
  }, []);

  async function updateStatus(id: string, status: 'NEW' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED') {
    const res = await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setMsg(`Feedback marked ${status}.`);
      await loadFeedback();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold text-white">Feedback Inbox &amp; AI Flags</h1>
      {msg && <p className="text-xs text-emerald-400">{msg}</p>}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-[#11151C] border border-gray-800 rounded-xl p-5 text-sm text-gray-400">
            No feedback reports yet.
          </div>
        ) : (
          items.map((f) => (
            <div
              key={f.id}
              className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-2 text-sm text-gray-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-amber-300">
                  {f.type} • {f.status}
                </span>
                <span className="text-gray-400">
                  From: {f.user?.username || f.guestEmail || 'Anonymous'}
                </span>
              </div>
              <p>{f.message}</p>
              {f.question && (
                <p className="text-xs text-gray-400 bg-[#181E28] p-2 rounded">
                  Linked Question [{f.question.category}]: {f.question.stemPlain}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                {(['IN_REVIEW', 'RESOLVED', 'DISMISSED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateStatus(f.id, st)}
                    className="px-2.5 py-1 rounded bg-[#1E2530] hover:bg-[#2A3444] text-xs text-white"
                  >
                    Mark {st}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}