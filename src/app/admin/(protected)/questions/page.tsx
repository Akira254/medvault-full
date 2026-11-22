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

interface QueuedQuestion {
  tempId: string;
  category: 'MCQ' | 'SAQ' | 'ESSAY';
  disciplineId: string;
  subdisciplineId: string;
  topicId: string;
  examYear: string;
  totalMarks: string;
  stemHtml: string;
  explanationHtml: string;
  options: Array<{ label: string; contentHtml: string }>;
  correctOptionIndex: number | null;
  sections: Array<{ label: string; contentHtml: string; marks: string }>;
}

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createEmptyOptions() {
  return [
    { label: 'A', contentHtml: '' },
    { label: 'B', contentHtml: '' },
    { label: 'C', contentHtml: '' },
    { label: 'D', contentHtml: '' },
  ];
}

function createEmptySections() {
  return [{ label: '(a)', contentHtml: '', marks: '5' }];
}

async function safeParseJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `Request failed with status ${res.status}` };
  }
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
  const [options, setOptions] = useState(createEmptyOptions);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);
  const [sections, setSections] = useState(createEmptySections);

  // Batch queue for adding multiple questions at once
  const [queuedQuestions, setQueuedQuestions] = useState<QueuedQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Bulk Assort bar
  const [bulkDiscId, setBulkDiscId] = useState('');
  const [bulkTopicId, setBulkTopicId] = useState('');
  const [bulkYear, setBulkYear] = useState('');

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadTaxonomy() {
    try {
      const res = await fetch('/api/admin/taxonomy');
      if (res.ok) {
        const data = await safeParseJson(res);
        setDisciplines(data.disciplines || []);
        setSubdisciplines(data.subdisciplines || []);
        setTopics(data.topics || []);
      }
    } catch {
      // ignore transient network error on initial load
    }
  }

  async function loadQuestions() {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (filterDiscipline) params.set('disciplineId', filterDiscipline);

      const res = await fetch(`/api/admin/questions?${params.toString()}`);
      if (res.ok) {
        const data = await safeParseJson(res);
        setQuestions(data.questions || []);
        setSelectedIds([]);
      }
    } catch {
      // ignore transient network error on refresh
    }
  }

  useEffect(() => {
    loadTaxonomy();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filterStatus, filterCategory, filterDiscipline]);

  function buildCurrentDraftPayload(): QueuedQuestion | { error: string } {
    const plainStem = stripHtmlToPlain(stemHtml);
    if (!plainStem) {
      return { error: 'Please enter a Question Stem before saving.' };
    }

    return {
      tempId: crypto.randomUUID(),
      category,
      disciplineId,
      subdisciplineId,
      topicId,
      examYear,
      totalMarks,
      stemHtml,
      explanationHtml,
      options: options.map((o) => ({ ...o })),
      correctOptionIndex,
      sections: sections.map((s) => ({ ...s })),
    };
  }

  function resetCurrentComposerFields(keepTaxonomy = true) {
    setStemHtml('');
    setExplanationHtml('');
    setOptions(createEmptyOptions());
    setCorrectOptionIndex(null);
    setSections(createEmptySections());
    setTotalMarks('');
    if (!keepTaxonomy) {
      setDisciplineId('');
      setSubdisciplineId('');
      setTopicId('');
      setExamYear('');
    }
  }

  function handleAddToBatchQueue() {
    setMsg(null);
    setErr(null);

    const built = buildCurrentDraftPayload();
    if ('error' in built) {
      setErr(built.error);
      return;
    }

    setQueuedQuestions((prev) => [...prev, built]);
    resetCurrentComposerFields(true);
    setMsg('Question added to batch queue. Add another or save/publish all below.');
  }

  function removeQueuedItem(tempId: string) {
    setQueuedQuestions((prev) => prev.filter((item) => item.tempId !== tempId));
  }

  async function persistQuestionItem(
    item: QueuedQuestion,
    targetStatus: 'DRAFT' | 'PUBLISHED'
  ): Promise<{ ok: boolean; error?: string; id?: string }> {
    const createRes = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: item.category,
        disciplineId: item.disciplineId || null,
        subdisciplineId: item.subdisciplineId || null,
        topicId: item.topicId || null,
        examYear: item.examYear || null,
        totalMarks: item.totalMarks || null,
        stemHtml: item.stemHtml,
        explanationHtml: item.category === 'MCQ' ? item.explanationHtml : null,
        options: item.category === 'MCQ' ? item.options : [],
        correctOptionIndex: item.category === 'MCQ' ? item.correctOptionIndex : null,
        sections: item.category !== 'MCQ' ? item.sections : [],
        status: targetStatus,
      }),
    });

    const createData = await safeParseJson(createRes);
    if (!createRes.ok) {
      return { ok: false, error: createData.error || 'Failed to save question' };
    }

    const createdId: string | undefined = createData.question?.id || createData.id;

    // If the backend ignored `status: 'PUBLISHED'` on POST, promote it via the existing token flow
    if (targetStatus === 'PUBLISHED' && createdId && createData.question?.status !== 'PUBLISHED') {
      const reqRes = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_PUBLISH_TOKEN',
          publishAction: 'PUBLISH',
          questionIds: [createdId],
        }),
      });
      const reqData = await safeParseJson(reqRes);
      if (!reqRes.ok || !reqData.token) {
        return {
          ok: false,
          error: reqData.error || 'Saved as draft, but could not prepare publish token.',
        };
      }

      const execRes = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXECUTE_PUBLISH_TOKEN',
          token: reqData.token,
        }),
      });
      const execData = await safeParseJson(execRes);
      if (!execRes.ok) {
        return {
          ok: false,
          error: execData.error || 'Saved as draft, but failed to execute publish.',
        };
      }
    }

    return { ok: true, id: createdId };
  }

  async function handleSubmitQuestions(targetStatus: 'DRAFT' | 'PUBLISHED') {
    setMsg(null);
    setErr(null);

    const itemsToSave: QueuedQuestion[] = [...queuedQuestions];
    const hasCurrentInput =
      stripHtmlToPlain(stemHtml).length > 0 ||
      options.some((o) => o.contentHtml.trim().length > 0);

    if (hasCurrentInput) {
      const built = buildCurrentDraftPayload();
      if ('error' in built) {
        setErr(built.error);
        return;
      }
      itemsToSave.push(built);
    }

    if (itemsToSave.length === 0) {
      setErr('Enter a question stem or add at least one question to the batch queue.');
      return;
    }

    setSubmitting(true);
    try {
      let savedCount = 0;
      const failedItems: QueuedQuestion[] = [];
      let lastError = '';

      for (const item of itemsToSave) {
        const result = await persistQuestionItem(item, targetStatus);
        if (result.ok) {
          savedCount += 1;
        } else {
          failedItems.push(item);
          lastError = result.error || 'Failed to save question';
        }
      }

      if (failedItems.length === 0) {
        setQueuedQuestions([]);
        resetCurrentComposerFields(true);
        setShowComposer(false);
        setMsg(
          targetStatus === 'PUBLISHED'
            ? `Saved and published ${savedCount} question(s).`
            : `Saved ${savedCount} question(s) as DRAFT.`
        );
      } else {
        setQueuedQuestions(failedItems);
        setErr(
          savedCount > 0
            ? `Saved ${savedCount} question(s), but ${failedItems.length} failed: ${lastError}`
            : lastError
        );
      }

      await loadQuestions();
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Network error while saving question(s).');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBulkAssort() {
    if (selectedIds.length === 0) return;
    setMsg(null);
    setErr(null);

    try {
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

      const data = await safeParseJson(res);
      if (!res.ok) {
        setErr(data.error || 'Bulk assort failed');
        return;
      }
      setMsg(`Assorted & renumbered ${data.updatedCount} question(s).`);
      await loadQuestions();
    } catch {
      setErr('Network error during bulk assort.');
    }
  }

  async function handleConfirmedBulkAction(publishAction: 'PUBLISH' | 'UNPUBLISH' | 'DELETE') {
    if (selectedIds.length === 0) return;
    setMsg(null);
    setErr(null);

    try {
      const reqRes = await fetch('/api/admin/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REQUEST_PUBLISH_TOKEN',
          publishAction,
          questionIds: selectedIds,
        }),
      });
      const reqData = await safeParseJson(reqRes);
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
      const execData = await safeParseJson(execRes);
      if (!execRes.ok) {
        setErr(execData.error || 'Action failed');
        return;
      }

      setMsg(`${publishAction} completed for ${execData.count} question(s).`);
      await loadQuestions();
    } catch {
      setErr('Network error during bulk action.');
    }
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
            Rich-text authoring, batch entry, manual classification, bulk assorting, and publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowComposer((v) => !v)}
          className="px-4 py-2 rounded-lg bg-[#2F80C9] hover:opacity-95 text-xs font-bold text-white"
        >
          {showComposer ? 'Close Editor' : '+ New Question(s)'}
        </button>
      </div>

      {msg && (
        <div className="rounded-lg bg-emerald-950/60 border border-emerald-700/60 px-3.5 py-2 text-xs text-emerald-300">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg bg-red-950/60 border border-red-700/60 px-3.5 py-2 text-xs text-red-300">
          {err}
        </div>
      )}

      {/* Rich-Text Question Composer (Single or Multi-Question Batch) */}
      {showComposer && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitQuestions('DRAFT');
          }}
          className="bg-[#11151C] border border-gray-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-800">
            <span className="text-xs font-bold text-white">
              Question Composer {queuedQuestions.length > 0 ? `(${queuedQuestions.length} queued)` : ''}
            </span>
            <button
              type="button"
              disabled={submitting}
              onClick={handleAddToBatchQueue}
              className="px-3 py-1.5 rounded-lg bg-[#181E28] hover:bg-[#222A38] border border-gray-700 text-xs font-semibold text-blue-300 disabled:opacity-50"
            >
              + Add Another Question to Batch
            </button>
          </div>

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

          {/* Queued Batch Items */}
          {queuedQuestions.length > 0 && (
            <div className="rounded-lg bg-[#181E28] border border-gray-700 p-3 space-y-2">
              <div className="text-xs font-bold text-blue-200">
                Batch Queue ({queuedQuestions.length} ready to submit)
              </div>
              <ul className="space-y-1.5">
                {queuedQuestions.map((q, idx) => (
                  <li
                    key={q.tempId}
                    className="flex items-center justify-between gap-2 text-xs text-gray-200 bg-[#11151C] px-3 py-1.5 rounded border border-gray-800"
                  >
                    <span className="truncate">
                      <strong>#{idx + 1} [{q.category}]</strong> {stripHtmlToPlain(q.stemHtml)}
                    </span>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => removeQueuedItem(q.tempId)}
                      className="text-red-400 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-[#0E8A3E] hover:opacity-95 disabled:opacity-50 text-xs font-bold text-white"
            >
              {submitting
                ? 'Saving...'
                : queuedQuestions.length > 0
                ? `Save All as Draft (${queuedQuestions.length + (stripHtmlToPlain(stemHtml) ? 1 : 0)})`
                : 'Save Question as Draft'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitQuestions('PUBLISHED')}
              className="px-4 py-2 rounded-lg bg-[#2F80C9] hover:opacity-95 disabled:opacity-50 text-xs font-bold text-white"
            >
              {submitting
                ? 'Publishing...'
                : queuedQuestions.length > 0
                ? `Save & Publish All (${queuedQuestions.length + (stripHtmlToPlain(stemHtml) ? 1 : 0)})`
                : 'Save & Publish'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={handleAddToBatchQueue}
              className="px-3.5 py-2 rounded-lg bg-[#181E28] hover:bg-[#222A38] border border-gray-700 disabled:opacity-50 text-xs font-semibold text-gray-200"
            >
              + Queue &amp; Add Next
            </button>
          </div>
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
              type="button"
              onClick={handleBulkAssort}
              className="px-2.5 py-1 rounded bg-[#2F80C9] text-xs font-semibold text-white"
            >
              Bulk Assort
            </button>
            <button
              type="button"
              onClick={() => handleConfirmedBulkAction('PUBLISH')}
              className="px-2.5 py-1 rounded bg-[#0E8A3E] text-xs font-semibold text-white"
            >
              Publish
            </button>
            <button
              type="button"
              onClick={() => handleConfirmedBulkAction('UNPUBLISH')}
              className="px-2.5 py-1 rounded bg-amber-600 text-xs font-semibold text-white"
            >
              Unpublish
            </button>
            <button
              type="button"
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
if (!createRes.ok) {
  return {
    ok: false,
    error: `[${createRes.status} ${createRes.statusText}] ${
      createData.error || 'Failed to save question'
    }`,
  };
}