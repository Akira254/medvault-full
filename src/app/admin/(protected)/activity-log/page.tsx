'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface ActivityEntry {
  id: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  createdAt: string;
}

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: search, entityType });
      const res = await fetch(`/api/admin/activity-log?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) setLogs(data.logs || []);
    } finally {
      setLoading(false);
    }
  }, [search, entityType]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function handleExportCsv() {
    const header = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Summary'];
    const rows = [
      header.join(','),
      ...logs.map((l) =>
        [
          `"${l.createdAt}"`,
          `"${(l.actorEmail || '').replace(/"/g, '""')}"`,
          `"${l.action}"`,
          `"${l.entityType}"`,
          `"${l.summary.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medvault-activity-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Activity & Audit Log</h1>
          <p className="text-sm text-slate-600">
            Audit trail of admin logins, taxonomy edits, bulk assorting, imports, publishing, and role changes.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Categories</option>
            <option value="DISCIPLINE">Discipline</option>
            <option value="TOPIC">Topic</option>
            <option value="QUESTION">Question</option>
            <option value="SUBSCRIBER">Subscriber</option>
            <option value="USER">User</option>
            <option value="AI_SETTINGS">AI Settings</option>
          </select>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, or summary..."
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading activity logs...</p>
        ) : logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No activity entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">{entry.actorEmail || 'System'}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-800">{entry.summary}</td>
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