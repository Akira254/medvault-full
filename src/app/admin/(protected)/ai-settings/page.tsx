'use client';

import React, { useEffect, useState } from 'react';

interface AiConfigState {
  defaultProvider: string;
  defaultModel: string;
  fallbackProvider: string;
  fallbackModel: string;
  assistantModel: string;
  classificationModel: string;
  customBaseUrl: string;
  guestDailyLimit: number;
  studentHourlyLimit: number;
}

interface UsageRow {
  provider: string;
  model: string;
  _count?: { id?: number };
  _sum?: {
    promptTokens?: number | null;
    completionTokens?: number | null;
    estimatedCostUsd?: number | null;
  };
}

export default function AdminAiSettingsPage() {
  const [form, setForm] = useState<AiConfigState>({
    defaultProvider: 'gemini',
    defaultModel: 'gemini-2.5-flash',
    fallbackProvider: 'openai',
    fallbackModel: 'gpt-4o-mini',
    assistantModel: 'gemini-2.5-flash',
    classificationModel: 'gemini-2.5-flash',
    customBaseUrl: '',
    guestDailyLimit: 5,
    studentHourlyLimit: 30,
  });
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/admin/ai-settings', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.settings) {
        setForm((prev) => ({ ...prev, ...data.settings }));
        setUsage(data.usageByModel || []);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save AI settings');
      setStatusMsg('AI provider configuration saved.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Save error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6 text-slate-900">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-[#0B1F3A]">AI Provider Settings</h1>
        <p className="text-sm text-slate-600">
          Configure primary/fallback providers, per-feature models, OpenAI-compatible endpoints, and rate quotas.
          API keys stay strictly in server environment variables.
        </p>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {statusMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Default Provider
            </label>
            <select
              value={form.defaultProvider}
              onChange={(e) => setForm({ ...form, defaultProvider: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai-compatible">OpenAI-Compatible (Groq / OpenRouter / Ollama)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Default Model
            </label>
            <input
              value={form.defaultModel}
              onChange={(e) => setForm({ ...form, defaultModel: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Fallback Provider
            </label>
            <select
              value={form.fallbackProvider}
              onChange={(e) => setForm({ ...form, fallbackProvider: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai-compatible">OpenAI-Compatible</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Fallback Model
            </label>
            <input
              value={form.fallbackModel}
              onChange={(e) => setForm({ ...form, fallbackModel: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Student Assistant Model
            </label>
            <input
              value={form.assistantModel}
              onChange={(e) => setForm({ ...form, assistantModel: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Document / Import Classification Model
            </label>
            <input
              value={form.classificationModel}
              onChange={(e) => setForm({ ...form, classificationModel: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase text-slate-600">
              OpenAI-Compatible Base URL (Optional)
            </label>
            <input
              value={form.customBaseUrl}
              onChange={(e) => setForm({ ...form, customBaseUrl: e.target.value })}
              placeholder="e.g., https://api.groq.com/openai/v1 or http://localhost:11434/v1"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Guest Daily Question Limit
            </label>
            <input
              type="number"
              min={0}
              value={form.guestDailyLimit}
              onChange={(e) => setForm({ ...form, guestDailyLimit: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Logged-In Student Hourly Limit
            </label>
            <input
              type="number"
              min={1}
              value={form.studentHourlyLimit}
              onChange={(e) => setForm({ ...form, studentHourlyLimit: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          disabled={saving}
          type="submit"
          className="rounded-lg bg-[#2F80C9] px-5 py-2 text-sm font-medium text-white hover:bg-[#123A66] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save AI Settings'}
        </button>
      </form>

      {/* Usage Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-[#0B1F3A]">Token & Usage Summary</h2>
        {usage.length === 0 ? (
          <p className="text-sm text-slate-500">No AI usage logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Provider</th>
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Requests</th>
                  <th className="py-2 pr-4">Prompt Tokens</th>
                  <th className="py-2">Completion Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usage.map((row, idx) => (
                  <tr key={`${row.provider}-${row.model}-${idx}`}>
                    <td className="py-2 pr-4 font-medium">{row.provider}</td>
                    <td className="py-2 pr-4">{row.model}</td>
                    <td className="py-2 pr-4">{row._count?.id ?? 0}</td>
                    <td className="py-2 pr-4">{row._sum?.promptTokens ?? 0}</td>
                    <td className="py-2">{row._sum?.completionTokens ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}