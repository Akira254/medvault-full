'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface DisciplineRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { subdisciplines?: number; topics?: number; questions?: number };
}

interface SubdisciplineRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  disciplineId: string;
  discipline?: { id: string; name: string };
  _count?: { topics?: number; questions?: number };
}

interface TopicRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  disciplineId: string;
  subdisciplineId?: string | null;
  discipline?: { id: string; name: string };
  subdiscipline?: { id: string; name: string } | null;
  _count?: { questions?: number };
}

export default function AdminTaxonomyPage() {
  const [disciplines, setDisciplines] = useState<DisciplineRow[]>([]);
  const [subdisciplines, setSubdisciplines] = useState<SubdisciplineRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Create forms
  const [discName, setDiscName] = useState('');
  const [discDesc, setDiscDesc] = useState('');

  const [subName, setSubName] = useState('');
  const [subDisciplineId, setSubDisciplineId] = useState('');

  const [topicName, setTopicName] = useState('');
  const [topicDisciplineId, setTopicDisciplineId] = useState('');
  const [topicSubdisciplineId, setTopicSubdisciplineId] = useState('');

  // Inline rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadTaxonomy = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/taxonomy?q=${encodeURIComponent(search)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load taxonomy');

      setDisciplines(data.disciplines || []);
      setSubdisciplines(data.subdisciplines || []);
      setTopics(data.topics || []);

      if (!subDisciplineId && (data.disciplines || []).length > 0) {
        setSubDisciplineId(data.disciplines[0].id);
      }
      if (!topicDisciplineId && (data.disciplines || []).length > 0) {
        setTopicDisciplineId(data.disciplines[0].id);
      }
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to fetch taxonomy',
      });
    } finally {
      setLoading(false);
    }
  }, [search, subDisciplineId, topicDisciplineId]);

  useEffect(() => {
    loadTaxonomy();
  }, [loadTaxonomy]);

  const filteredSubdisciplines = useMemo(() => {
    if (selectedDisciplineFilter === 'ALL') return subdisciplines;
    return subdisciplines.filter((s) => s.disciplineId === selectedDisciplineFilter);
  }, [subdisciplines, selectedDisciplineFilter]);

  const filteredTopics = useMemo(() => {
    if (selectedDisciplineFilter === 'ALL') return topics;
    return topics.filter((t) => t.disciplineId === selectedDisciplineFilter);
  }, [topics, selectedDisciplineFilter]);

  const availableTopicSubdisciplines = useMemo(
    () => subdisciplines.filter((s) => s.disciplineId === topicDisciplineId),
    [subdisciplines, topicDisciplineId]
  );

  async function handleCreate(
    kind: 'DISCIPLINE' | 'SUBDISCIPLINE' | 'TOPIC',
    payload: Record<string, unknown>,
    reset: () => void
  ) {
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/taxonomy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Creation failed');
      reset();
      setBanner({ type: 'ok', text: `${kind.toLowerCase()} created.` });
      await loadTaxonomy();
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error creating item',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRenameSave(kind: 'DISCIPLINE' | 'SUBDISCIPLINE' | 'TOPIC', id: string) {
    if (!editingName.trim()) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/taxonomy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setEditingId(null);
      setEditingName('');
      setBanner({ type: 'ok', text: 'Updated taxonomy label.' });
      await loadTaxonomy();
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error updating item',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(kind: 'DISCIPLINE' | 'SUBDISCIPLINE' | 'TOPIC', id: string, label: string) {
    if (!window.confirm(`Delete ${kind.toLowerCase()} "${label}"?`)) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch(
        `/api/admin/taxonomy?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setBanner({ type: 'ok', text: `Deleted "${label}".` });
      await loadTaxonomy();
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Error deleting item',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Taxonomy Management</h1>
          <p className="text-sm text-slate-600">
            Manage Disciplines, optional Subdisciplines, and Topics powering navigation, search, and question sorting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter disciplines, subdisciplines, topics..."
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#2F80C9] focus:outline-none"
          />
          <select
            value={selectedDisciplineFilter}
            onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Disciplines</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Quick Create Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* New Discipline */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate('DISCIPLINE', { name: discName, description: discDesc }, () => {
              setDiscName('');
              setDiscDesc('');
            });
          }}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <h2 className="font-semibold text-[#0B1F3A]">+ Add Discipline</h2>
          <input
            required
            value={discName}
            onChange={(e) => setDiscName(e.target.value)}
            placeholder="e.g., Pharmacology"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={discDesc}
            onChange={(e) => setDiscDesc(e.target.value)}
            placeholder="Optional short description"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            disabled={saving}
            type="submit"
            className="w-full rounded-lg bg-[#2F80C9] px-4 py-2 text-sm font-medium text-white hover:bg-[#123A66] disabled:opacity-50"
          >
            Create Discipline
          </button>
        </form>

        {/* New Subdiscipline */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate(
              'SUBDISCIPLINE',
              { name: subName, disciplineId: subDisciplineId },
              () => setSubName('')
            );
          }}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <h2 className="font-semibold text-[#0B1F3A]">+ Add Subdiscipline (Optional)</h2>
          <select
            required
            value={subDisciplineId}
            onChange={(e) => setSubDisciplineId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select Discipline</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            required
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
            placeholder="e.g., Autonomic Pharmacology"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            disabled={saving || !subDisciplineId}
            type="submit"
            className="w-full rounded-lg bg-[#2F80C9] px-4 py-2 text-sm font-medium text-white hover:bg-[#123A66] disabled:opacity-50"
          >
            Create Subdiscipline
          </button>
        </form>

        {/* New Topic */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate(
              'TOPIC',
              {
                name: topicName,
                disciplineId: topicDisciplineId,
                subdisciplineId: topicSubdisciplineId || null,
              },
              () => {
                setTopicName('');
                setTopicSubdisciplineId('');
              }
            );
          }}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <h2 className="font-semibold text-[#0B1F3A]">+ Add Topic</h2>
          <select
            required
            value={topicDisciplineId}
            onChange={(e) => {
              setTopicDisciplineId(e.target.value);
              setTopicSubdisciplineId('');
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Select Discipline</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={topicSubdisciplineId}
            onChange={(e) => setTopicSubdisciplineId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">No Subdiscipline (Direct under Discipline)</option>
            {availableTopicSubdisciplines.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            required
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g., Cholinergic Agonists & Antagonists"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            disabled={saving || !topicDisciplineId}
            type="submit"
            className="w-full rounded-lg bg-[#2F80C9] px-4 py-2 text-sm font-medium text-white hover:bg-[#123A66] disabled:opacity-50"
          >
            Create Topic
          </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading taxonomy...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Disciplines & Subdisciplines */}
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-[#0B1F3A]">
                Disciplines ({disciplines.length})
              </h2>
              {disciplines.length === 0 ? (
                <p className="text-sm text-slate-500">No disciplines match your filter.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {disciplines.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                      {editingId === d.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => handleRenameSave('DISCIPLINE', d.id)}
                            className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded bg-slate-200 px-2.5 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="font-medium text-slate-900">{d.name}</div>
                            <div className="text-xs text-slate-500">
                              {d._count?.topics ?? 0} topics • {d._count?.questions ?? 0} questions
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingId(d.id);
                                setEditingName(d.name);
                              }}
                              className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDelete('DISCIPLINE', d.id, d.name)}
                              className="rounded border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-[#0B1F3A]">
                Subdisciplines ({filteredSubdisciplines.length})
              </h2>
              {filteredSubdisciplines.length === 0 ? (
                <p className="text-sm text-slate-500">No subdisciplines found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredSubdisciplines.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="font-medium text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">
                          Discipline: {s.discipline?.name || '—'} • {s._count?.topics ?? 0} topics
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete('SUBDISCIPLINE', s.id, s.name)}
                        className="rounded border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Topics */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-[#0B1F3A]">
              Topics ({filteredTopics.length})
            </h2>
            {filteredTopics.length === 0 ? (
              <p className="text-sm text-slate-500">No topics match your filter.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredTopics.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 py-2.5">
                    {editingId === t.id ? (
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => handleRenameSave('TOPIC', t.id)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded bg-slate-200 px-2.5 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="font-medium text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500">
                            {t.discipline?.name || '—'}
                            {t.subdiscipline?.name ? ` › ${t.subdiscipline.name}` : ''} •{' '}
                            {t._count?.questions ?? 0} questions
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setEditingName(t.name);
                            }}
                            className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => handleDelete('TOPIC', t.id, t.name)}
                            className="rounded border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}