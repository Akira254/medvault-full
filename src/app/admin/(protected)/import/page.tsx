'use client';

import React, { useEffect, useState } from 'react';

interface PreviewRow {
  rowIndex: number;
  category: string;
  stemPlain: string;
  discipline: string;
  subdiscipline: string;
  topic: string;
  examYear: string;
  marks: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
  explanation: string;
  rejected?: boolean;
  isDuplicate?: boolean;
}

const MEDVAULT_FIELDS = [
  { key: 'category', label: 'Category (MCQ/SAQ/ESSAY)' },
  { key: 'stemPlain', label: 'Question Text' },
  { key: 'discipline', label: 'Discipline' },
  { key: 'subdiscipline', label: 'Subdiscipline' },
  { key: 'topic', label: 'Topic' },
  { key: 'examYear', label: 'Examination Year' },
  { key: 'marks', label: 'Marks (SAQ/Essay)' },
  { key: 'optionA', label: 'Option A' },
  { key: 'optionB', label: 'Option B' },
  { key: 'optionC', label: 'Option C' },
  { key: 'optionD', label: 'Option D' },
  { key: 'optionE', label: 'Option E' },
  { key: 'correctAnswer', label: 'Correct Answer (A-E)' },
  { key: 'explanation', label: 'MCQ Explanation' },
] as const;

export default function AdminImportsPage() {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [rawSheets, setRawSheets] = useState<
    Record<string, { headers: string[]; rows: Record<string, string>[] }>
  >({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; mapping: Record<string, string> }>>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadHistory() {
    const res = await fetch('/api/admin/import/commit');
    if (res.ok) {
      const data = await res.json();
      setBatches(data.batches || []);
      setTemplates(data.templates || []);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function downloadBlankTemplate() {
    const headers = MEDVAULT_FIELDS.map((f) => f.key).join(',');
    const blob = new Blob([`${headers}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medvault_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function autoMapHeaders(headers: string[]) {
    const mapped: Record<string, string> = {};
    for (const field of MEDVAULT_FIELDS) {
      const match = headers.find(
        (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.key.toLowerCase()
      );
      if (match) mapped[field.key] = match;
    }
    setColumnMapping(mapped);
  }

  function buildPreviewFromSheet(
    sheetName: string,
    sheetsObj: Record<string, { headers: string[]; rows: Record<string, string>[] }>,
    mapping: Record<string, string>
  ) {
    const sheet = sheetsObj[sheetName];
    if (!sheet) return;
    const rows: PreviewRow[] = sheet.rows.map((raw, idx) => ({
      rowIndex: idx + 1,
      category: raw[mapping.category] || 'MCQ',
      stemPlain: raw[mapping.stemPlain] || '',
      discipline: raw[mapping.discipline] || '',
      subdiscipline: raw[mapping.subdiscipline] || '',
      topic: raw[mapping.topic] || '',
      examYear: raw[mapping.examYear] || '',
      marks: raw[mapping.marks] || '',
      optionA: raw[mapping.optionA] || '',
      optionB: raw[mapping.optionB] || '',
      optionC: raw[mapping.optionC] || '',
      optionD: raw[mapping.optionD] || '',
      optionE: raw[mapping.optionE] || '',
      correctAnswer: raw[mapping.correctAnswer] || '',
      explanation: raw[mapping.explanation] || '',
    }));
    setPreviewRows(rows);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setErr(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/import/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Parse failed');
        return;
      }

      setFileName(data.fileName);
      setFileType(data.fileType);

      if (data.mode === 'spreadsheet') {
        setSheetNames(data.sheetNames || []);
        setRawSheets(data.sheets || {});
        const first = data.sheetNames?.[0] || '';
        setActiveSheet(first);
        if (first && data.sheets[first]) {
          autoMapHeaders(data.sheets[first].headers);
        }
      } else {
        setSheetNames([]);
        setRawSheets({});
        setPreviewRows(data.rows || []);
      }
    } catch {
      setErr('Failed to upload and parse file');
    } finally {
      setBusy(false);
    }
  }

  async function saveMappingTemplate() {
    if (!templateName.trim()) return;
    const res = await fetch('/api/admin/import/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'SAVE_TEMPLATE',
        name: templateName,
        mapping: columnMapping,
      }),
    });
    if (res.ok) {
      setTemplateName('');
      setMsg('Mapping template saved.');
      await loadHistory();
    }
  }

  async function commitRows() {
    if (previewRows.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          fileType,
          mappingConfig: columnMapping,
          rows: previewRows,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Import commit failed');
        return;
      }
      setMsg(
        `Committed batch: ${data.batch.importedCount} imported as DRAFT, ${data.batch.unclassifiedCount} unclassified, ${data.batch.duplicateCount} duplicates, ${data.batch.rejectedCount} rejected.`
      );
      setPreviewRows([]);
      await loadHistory();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">
            Spreadsheet &amp; Document Importer
          </h1>
          <p className="text-xs text-gray-400">
            Supports CSV, XLS, XLSX (multi-sheet), DOCX, and PDF. All imports land as Draft.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadBlankTemplate}
          className="px-3.5 py-2 rounded-lg bg-[#1E2530] hover:bg-[#2A3444] text-xs font-semibold text-white"
        >
          Download Blank CSV Template
        </button>
      </div>

      {msg && <p className="text-xs text-emerald-400">{msg}</p>}
      {err && <p className="text-xs text-red-400">{err}</p>}

      {/* Upload Box */}
      <div className="bg-[#11151C] border border-gray-800 rounded-xl p-5 space-y-4">
        <input
          type="file"
          accept=".csv,.xls,.xlsx,.docx,.pdf"
          onChange={handleFileUpload}
          disabled={busy}
          className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#2F80C9] file:text-white"
        />

        {/* Spreadsheet Sheet Selector & Column Mapping */}
        {sheetNames.length > 0 && activeSheet && rawSheets[activeSheet] && (
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-400">Sheet:</span>
              {sheetNames.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setActiveSheet(s);
                    autoMapHeaders(rawSheets[s].headers);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    activeSheet === s ? 'bg-[#2F80C9] text-white' : 'bg-[#181E28] text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}

              {templates.length > 0 && (
                <select
                  onChange={(e) => {
                    const found = templates.find((t) => t.id === e.target.value);
                    if (found) setColumnMapping(found.mapping);
                  }}
                  className="ml-auto rounded bg-[#181E28] border border-gray-700 px-2.5 py-1 text-xs text-white"
                >
                  <option value="">Load Saved Mapping Template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MEDVAULT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-[11px] text-gray-400 mb-1">{field.label}</label>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full rounded bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="">-- Unmapped --</option>
                    {rawSheets[activeSheet].headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => buildPreviewFromSheet(activeSheet, rawSheets, columnMapping)}
                className="px-4 py-2 rounded-lg bg-[#0E8A3E] text-xs font-bold text-white"
              >
                Apply Mapping &amp; Preview Rows
              </button>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="rounded bg-[#181E28] border border-gray-700 px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={saveMappingTemplate}
                className="px-3 py-1.5 rounded bg-[#1E2530] text-xs text-white"
              >
                Save Mapping Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Editable Preview Grid */}
      {previewRows.length > 0 && (
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-4 overflow-x-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              Editable Preview Grid ({previewRows.length} rows)
            </h2>
            <button
              type="button"
              onClick={commitRows}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-[#0E8A3E] text-xs font-bold text-white disabled:opacity-50"
            >
              {busy ? 'Committing...' : 'Commit Approved Rows as Draft'}
            </button>
          </div>

          <table className="w-full text-left text-xs text-gray-300">
            <thead className="border-b border-gray-800 text-gray-400 uppercase">
              <tr>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Cat</th>
                <th className="py-2 pr-2">Question Stem</th>
                <th className="py-2 pr-2">Discipline</th>
                <th className="py-2 pr-2">Topic</th>
                <th className="py-2 pr-2">Key</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr
                  key={row.rowIndex}
                  className={`border-b border-gray-800/50 ${row.rejected ? 'opacity-40' : ''}`}
                >
                  <td className="py-2 pr-2">{row.rowIndex}</td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.category}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, category: e.target.value } : r))
                        )
                      }
                      className="rounded bg-[#181E28] border border-gray-700 px-1.5 py-1 text-xs text-white"
                    >
                      <option value="MCQ">MCQ</option>
                      <option value="SAQ">SAQ</option>
                      <option value="ESSAY">ESSAY</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={row.stemPlain}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, stemPlain: e.target.value } : r))
                        )
                      }
                      className="w-64 rounded bg-[#181E28] border border-gray-700 px-2 py-1 text-xs text-white"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={row.discipline}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, discipline: e.target.value } : r))
                        )
                      }
                      placeholder="Discipline"
                      className="w-32 rounded bg-[#181E28] border border-gray-700 px-2 py-1 text-xs text-white"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={row.topic}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, topic: e.target.value } : r))
                        )
                      }
                      placeholder="Topic"
                      className="w-32 rounded bg-[#181E28] border border-gray-700 px-2 py-1 text-xs text-white"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={row.correctAnswer}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((r, i) =>
                            i === idx ? { ...r, correctAnswer: e.target.value.toUpperCase() } : r
                          )
                        )
                      }
                      maxLength={1}
                      className="w-10 rounded bg-[#181E28] border border-gray-700 px-1.5 py-1 text-xs text-white text-center"
                    />
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewRows((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, rejected: !r.rejected } : r))
                        )
                      }
                      className="px-2 py-1 rounded bg-[#9B1126] text-[11px] text-white"
                    >
                      {row.rejected ? 'Restore' : 'Reject'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Import Batch History */}
      <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-2">
        <h2 className="text-sm font-bold text-white">Import History</h2>
        {batches.map((b) => (
          <div
            key={b.id}
            className="p-2.5 rounded-lg bg-[#181E28] text-xs text-gray-300 flex flex-wrap justify-between gap-2"
          >
            <span>
              <strong>{b.fileName}</strong> ({b.fileType.toUpperCase()})
            </span>
            <span>
              Imported: {b.importedCount} • Unclassified: {b.unclassifiedCount} • Duplicates:{' '}
              {b.duplicateCount} • Rejected: {b.rejectedCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}