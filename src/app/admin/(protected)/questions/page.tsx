'use client';

import React, { useEffect, useState } from 'react';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

interface TaxonomyItem {
  id: string;
  name: string;
  disciplineId?: string;
  subdisciplineId?: string | null;
}

interface QuestionRow {
  id: string;
  displayNumber: number;
  category: 'MCQ' | 'SAQ' | 'ESSAY';
  status: 'DRAFT' | 'REVIEWED' | 'PUBLISHED';
  stemPlain: string;
  examYear: number | null;
  totalMarks: number | null;
  mcqAnswerStatus: 'ANSWERED' | 'UNANSWERED' | null;
  isUnclassified: boolean;
  discipline?: { id: string; name: string } | null;
  topic?: { id: string; name: string } | null;
  _count?: { feedbacks: number };
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [disciplines, setDisciplines] = useState<TaxonomyItem[]>([]);
  const [subdisciplines, setSubdisciplines] = useState<TaxonomyItem[]>([]);
  const [topics, setTopics] = useState<TaxonomyItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('');

  // Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [category, setCategory] = useState<'MCQ' | 'SAQ' | 'ESSAY'>('MCQ');
  const [disciplineId, setDisciplineId] = useState('');
  const [subdisciplineId, setSubdisciplineId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [examYear, setExamYear] = useState('');
  const [totalMarks, setTotalMarks] = useState('');
  const [stemHtml, setStemHtml] = useState('');
  const [explanationHtml, setExplanationHtml] = useState('');
  const [options, setOptions] = useState([
    { label: 'A', contentHtml: '' },
    { label: 'B', contentHtml: '' },
    { label: 'C', contentHtml: '' },
    { label: 'D', contentHtml: '' },
  ]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [sections, setSections] = useState([{ label: '(a)', contentHtml: '', marks: '5' }]);

  // Bulk Assort bar
  const [bulkDiscId, setBulkDiscId] = useState('');
  const [bulkTopicId, setBulkTopicId] = useState('');
  const [bulkYear, setBulkYear] = useState('');

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadTaxonomy() {
    const res = await fetch('/api/admin/taxonomy');
    if (res.ok) {
      const data = await res.json();
      setDisciplines(data.disciplines || []);
      setSubdisciplines(data.subdisciplines || []);
      setTopics(data.topics || []);
    }
  }

  async function loadQuestions() {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterCategory) params.set('category', filterCategory);
    if (filterDiscipline) params.set('disciplineId', filterDiscipline);

    const res = await fetch(`/api/admin/questions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions || []);
      setSelectedIds([]);
    }
  }

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filterStatus, filterCategory, filterDiscipline]);

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        disciplineId: disciplineId || null,
        subdisciplineId: subdisciplineId || null,
        topicId: topicId || null,
        examYear: examYear || null,
        totalMarks: totalMarks || null,
        stemHtml,
        explanationHtml: category === 'MCQ' ? explanationHtml : null,
        options: category === 'MCQ' ? options : [],
        correctOptionIndex: category === 'MCQ' ? correctOptionIndex : null,
        sections: category !== 'MCQ' ? sections : [],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || 'Failed to save question');
      return;
    }

    setStemHtml('');
    setExplanationHtml('');
    setCorrectOptionIndex(null);
    setShowComposer(false);
    setMsg('Question created as DRAFT.');
    await loadQuestions();
  }

  async function handleBulkAssort() {
    if (selectedIds.length === 0) return;
    setMsg(null);
    setErr(null);

    const res = await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'BULK_ASSORT',
        questionIds: selectedIds,
        disciplineId: bulkDiscId || null,
        topicId: bulkTopicId || null,
        examYear: bulkYear || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || 'Bulk assort failed');
      return;
    }
    setMsg(`Assorted & renumbered ${data.updatedCount} question(s).`);
    await loadQuestions();
  }

  async function handleConfirmedBulkAction(publishAction: 'PUBLISH' | 'UNPUBLISH' | 'DELETE') {
    if (selectedIds.length === 0) return;
    setMsg(null);
    setErr(null);

    const reqRes = await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'REQUEST_PUBLISH_TOKEN',
        publishAction,
        questionIds: selectedIds,
      }),
    });
    const reqData = await reqRes.json();
    if (!reqRes.ok) {
      setErr(reqData.error || 'Validation failed');
      return;
    }

    const confirmed = window.confirm(
      `Confirm ${publishAction} for ${reqData.count} selected question(s)? This action is logged.`
    );
    if (!confirmed) return;

    const execRes = await fetch('/api/admin/questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'EXECUTE_PUBLISH_TOKEN',
        token: reqData.token,
      }),
    });
    const execData = await execRes.json();
    if (!execRes.ok) {
      setErr(execData.error || 'Action failed');
      return;
    }

    setMsg(`${publishAction} completed for ${execData.count} question(s).`);
    await loadQuestions();
  }

  function toggleSelectAll() {
    if (selectedIds.length === questions.length) setSelectedIds([]);
    else setSelectedIds(questions.map((q) => q.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">Questions Vault</h1>
          <p className="text-xs text-gray-400">
            Rich-text authoring, manual classification, bulk assorting, and confirmed publishing.
          </p>
        </div>
        <button
          onClick={() => setShowComposer((v) => !v)}
          className="px-4 py-2 rounded-lg bg-[#2F80C9] hover:opacity-95 text-xs font-bold text-white"
        >
          {showComposer ? 'Close Editor' : '+ New Question'}
        </button>
      </div>

      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-red-400">{err}</p>}

      {/* Rich-Text Question Composer */}
      {showComposer && (
        <form
          onSubmit={handleCreateQuestion}
          className="bg-[#11151C] border border-gray-800 rounded-xl p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'MCQ' | 'SAQ' | 'ESSAY')}
              className="rounded-lg bg-[#181E28] border border-gray-700 px-3 py-2 text-xs text-white"
            >
              <option value="MCQ">MCQ</option>
              <option value="SAQ">SAQ</option>
              <option value="ESSAY">ESSAY</option>
            </select>

            <select
              value={disciplineId}
              onChange={(e) => {
                setDisciplineId(e.target.value);
                setSubdisciplineId('');
                setTopicId('');
              }}
              className="rounded-lg bg-[#181E28] border border-gray-700 px-3 py-2 text-xs text-white"
            >
              <option value="">-- Discipline --</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={subdisciplineId}
              onChange={(e) => setSubdisciplineId(e.target.value)}
              className="rounded-lg bg-[#181E28] border border-gray-700 px-3 py-2 text-xs text-white"
            >
              <option value="">-- Subdiscipline (opt) --</option>
              {subdisciplines
                .filter((s) => s.disciplineId === disciplineId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>

            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="rounded-lg bg-[#181E28] border border-gray-700 px-3 py-2 text-xs text-white"
            >
              <option value="">-- Topic --</option>
              {topics
                .filter((t) => !disciplineId || t.disciplineId === disciplineId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>

            <div className="flex gap-2">
              <input
                type="number"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                placeholder="Year"
                className="w-1/2 rounded-lg bg-[#181E28] border border-gray-700 px-2.5 py-2 text-xs text-white"
              />
              {category !== 'MCQ' && (
                <input
                  type="number"
                  step="0.5"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                  placeholder="Marks"
                  className="w-1/2 rounded-lg bg-[#181E28] border border-gray-700 px-2.5 py-2 text-xs text-white"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Question Stem</label>
            <RichTextEditor value={stemHtml} onChange={setStemHtml} minHeight="130px" />
          </div>

          {category === 'MCQ' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">
                  MCQ Options (leave radio unchecked if no official answer key exists → Unanswered)
                </label>
                <button
                  type="button"
                  onClick={() => setCorrectOptionIndex(null)}
                  className="text-xs text-amber-300 hover:underline"
                >
                  Clear Key (Unanswered)
                </button>
              </div>
              {options.map((opt, idx) => (
                <div key={opt.label} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctOptionIndex === idx}
                    onChange={() => setCorrectOptionIndex(idx)}
                  />
                  <span className="text-xs font-bold text-white w-5">{opt.label}.</span>
                  <input
                    value={opt.contentHtml}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, i) => (i === idx ? { ...o, contentHtml: e.target.value } : o))
                      )
                    }
                    placeholder={`Option ${opt.label}`}
                    className="flex-1 rounded-lg bg-[#181E28] border border-gray-700 px-3 py-1.5 text-xs text-white"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Optional Verified Explanation (MCQ only)
                </label>
                <RichTextEditor
                  value={explanationHtml}
                  onChange={setExplanationHtml}
                  minHeight="90px"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">
                  Sub-sections &amp; Marks (No model answers stored for SAQ/Essay)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSections((prev) => [
                      ...prev,
                      { label: `(${String.fromCharCode(97 + prev.length)})`, contentHtml: '', marks: '5' },
                    ])
                  }
                  className="text-xs text-emerald-400 hover:underline"
                >
                  + Add Sub-section
                </button>
              </div>
              {sections.map((sec, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={sec.label}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s))
                      )
                    }
                    className="w-16 rounded-lg bg-[#181E28] border border-gray-700 px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    value={sec.contentHtml}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, contentHtml: e.target.value } : s))
                      )
                    }
                    placeholder="Section prompt"
                    className="flex-1 rounded-lg bg-[#181E28] border border-gray-700 px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={sec.marks}
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, marks: e.target.value } : s))
                      )
                    }
                    placeholder="Marks"
                    className="w-20 rounded-lg bg-[#181E28] border border-gray-700 px-2 py-1.5 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#0E8A3E] text-xs font-bold text-white"
          >
            Save Question as Draft
          </button>
        </form>
      )}

      {/* Filter & Bulk Assort Controls */}
      <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
          >
            <option value="">All Categories</option>
            <option value="MCQ">MCQ</option>
            <option value="SAQ">SAQ</option>
            <option value="ESSAY">ESSAY</option>
          </select>
          <select
            value={filterDiscipline}
            onChange={(e) => setFilterDiscipline(e.target.value)}
            className="rounded-lg bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
          >
            <option value="">All Disciplines</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-gray-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-emerald-400">
              {selectedIds.length} selected:
            </span>
            <select
              value={bulkDiscId}
              onChange={(e) => setBulkDiscId(e.target.value)}
              className="rounded bg-[#181E28] border border-gray-700 px-2 py-1 text-xs text-white"
            >
              <option value="">Assign Discipline</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={bulkTopicId}
              onChange={(e) => setBulkTopicId(e.target.value)}
              className="rounded bg-[#181E28] border border-gray-700 px-2 py-1 text-xs text-white"
            >
              <option value="">Assign Topic</option>
              {topics
                .filter((t) => !bulkDiscId || t.disciplineId === bulkDiscId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <input
              type="number"
              value={bulkYear}
              onChange={(e) => setBulkYear(e.target.value)}
              placeholder="Year"
              className="w-20 rounded bg-[#181E28] border border-gray-700 px-2 py-1 text-xs text-white"
            />
            <button
              onClick={handleBulkAssort}
              className="px-2.5 py-1 rounded bg-[#2F80C9] text-xs font-semibold text-white"
            >
              Bulk Assort
            </button>
            <button
              onClick={() => handleConfirmedBulkAction('PUBLISH')}
              className="px-2.5 py-1 rounded bg-[#0E8A3E] text-xs font-semibold text-white"
            >
              Publish
            </button>
            <button
              onClick={() => handleConfirmedBulkAction('UNPUBLISH')}
              className="px-2.5 py-1 rounded bg-amber-600 text-xs font-semibold text-white"
            >
              Unpublish
            </button>
            <button
              onClick={() => handleConfirmedBulkAction('DELETE')}
              className="px-2.5 py-1 rounded bg-[#9B1126] text-xs font-semibold text-white"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Question Table */}
      <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="border-b border-gray-800 text-gray-400 uppercase">
            <tr>
              <th className="py-2 pr-2">
                <input
                  type="checkbox"
                  checked={questions.length > 0 && selectedIds.length === questions.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Stem</th>
              <th className="py-2 pr-3">Classification</th>
              <th className="py-2 pr-3">Key / Marks</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-b border-gray-800/50">
                <td className="py-2.5 pr-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={(e) =>
                      setSelectedIds((prev) =>
                        e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id)
                      )
                    }
                  />
                </td>
                <td className="py-2.5 pr-3 font-mono">{q.displayNumber}</td>
                <td className="py-2.5 pr-3">{q.category}</td>
                <td className="py-2.5 pr-3 text-white max-w-md truncate">{q.stemPlain}</td>
                <td className="py-2.5 pr-3">
                  {q.discipline?.name && q.topic?.name ? (
                    <span>
                      {q.discipline.name} / {q.topic.name}
                    </span>
                  ) : (
                    <span className="text-red-400">Unclassified</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  {q.category === 'MCQ'
                    ? q.mcqAnswerStatus || 'UNANSWERED'
                    : q.totalMarks
                    ? `${q.totalMarks} marks`
                    : '—'}
                </td>
                <td className="py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      q.status === 'PUBLISHED'
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-amber-900/50 text-amber-300'
                    }`}
                  >
                    {q.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}