'use client';

import React, { useEffect, useState } from 'react';

export default function AdminUnclassifiedQueuePage() {
  const [items, setItems] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<
    Record<string, { disciplineId: string; topicId: string }>
  >({});
  const [msg, setMsg] = useState<string | null>(null);

  async function loadData() {
    const [qRes, tRes] = await Promise.all([
      fetch('/api/admin/questions?unclassified=true'),
      fetch('/api/admin/taxonomy'),
    ]);
    if (qRes.ok) {
      const qData = await qRes.json();
      setItems(qData.questions || []);
    }
    if (tRes.ok) {
      const tData = await tRes.json();
      setDisciplines(tData.disciplines || []);
      setTopics(tData.topics || []);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function assignOne(questionId: string) {
    const sel = assignments[questionId];
    if (!sel?.disciplineId || !sel?.topicId) {
      setMsg('Select both Discipline and Topic first.');
      return;
    }

    const res = await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'BULK_ASSORT',
        questionIds: [questionId],
        disciplineId: sel.disciplineId,
        topicId: sel.topicId,
      }),
    });

    if (res.ok) {
      setMsg('Question classified and renumbered.');
      await loadData();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-white">Unclassified Holding Queue</h1>
        <p className="text-xs text-gray-400">
          Assign Discipline &amp; Topic to move questions out of the holding queue.
        </p>
      </div>

      {msg && <p className="text-xs text-emerald-400">{msg}</p>}

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="bg-[#11151C] border border-gray-800 rounded-xl p-5 text-sm text-gray-400">
            All questions are classified.
          </div>
        ) : (
          items.map((q) => {
            const current = assignments[q.id] || { disciplineId: '', topicId: '' };
            return (
              <div
                key={q.id}
                className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-3"
              >
                <div className="text-xs text-red-400 font-bold">{q.category}</div>
                <p className="text-sm text-white">{q.stemPlain}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={current.disciplineId}
                    onChange={(e) =>
                      setAssignments((prev) => ({
                        ...prev,
                        [q.id]: { disciplineId: e.target.value, topicId: '' },
                      }))
                    }
                    className="rounded bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">-- Discipline --</option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={current.topicId}
                    onChange={(e) =>
                      setAssignments((prev) => ({
                        ...prev,
                        [q.id]: { ...current, topicId: e.target.value },
                      }))
                    }
                    className="rounded bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">-- Topic --</option>
                    {topics
                      .filter((t) => t.disciplineId === current.disciplineId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>

                  <button
                    onClick={() => assignOne(q.id)}
                    className="px-3 py-1.5 rounded bg-[#0E8A3E] text-xs font-bold text-white"
                  >
                    Assign &amp; Clear Queue
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}