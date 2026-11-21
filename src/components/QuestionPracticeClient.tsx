'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Send,
  ThumbsUp,
  ThumbsDown,
  Flag,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

export interface SafeQuestionData {
  id: string;
  displayNumber: number;
  category: 'MCQ' | 'SAQ' | 'ESSAY';
  examYear: number | null;
  stemHtml: string;
  totalMarks: number | null;
  mcqAnswerStatus: 'ANSWERED' | 'UNANSWERED' | null;
  discipline?: { name: string; slug: string } | null;
  subdiscipline?: { name: string; slug: string } | null;
  topic?: { name: string; slug: string } | null;
  sections: Array<{ id: string; label: string; contentHtml: string; marks: number | null }>;
  options: Array<{ id: string; label: string; contentHtml: string }>;
}

interface AiMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
}

export function QuestionPracticeClient({
  question,
  isPreview = false,
  isLoggedIn = false,
}: {
  question: SafeQuestionData;
  isPreview?: boolean;
  isLoggedIn?: boolean;
}) {
  // MCQ interaction state (answer key is NEVER sent to browser until submission)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [explanationHtml, setExplanationHtml] = useState<string | null>(null);
  const [showExplanationDrawer, setShowExplanationDrawer] = useState(false);
  const [checkingMcq, setCheckingMcq] = useState(false);

  // AI Assistant state
  const [aiOpenMobile, setAiOpenMobile] = useState(false);
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [reportedIds, setReportedIds] = useState<Record<string, string>>({});

  const handleSelectOption = async (optionId: string) => {
    if (checkingMcq || correctId) return;
    setSelectedId(optionId);

    if (question.mcqAnswerStatus === 'UNANSWERED') {
      // Unanswered MCQ: neutral selection, NOT graded
      return;
    }

    setCheckingMcq(true);
    try {
      const res = await fetch(`/api/questions/${question.id}/check-mcq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOptionId: optionId, isPreview }),
      });
      const data = await res.json();
      if (data.isCorrect) {
        setCorrectId(optionId);
        setExplanationHtml(data.explanationHtml || null);
        setShowExplanationDrawer(true);
      } else {
        setWrongIds((prev) => (prev.includes(optionId) ? prev : [...prev, optionId]));
      }
    } finally {
      setCheckingMcq(false);
    }
  };

  const handleRevealAnswer = async () => {
    if (question.mcqAnswerStatus !== 'ANSWERED') return;
    setCheckingMcq(true);
    try {
      const res = await fetch(`/api/questions/${question.id}/check-mcq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reveal: true, isPreview }),
      });
      const data = await res.json();
      if (data.correctOptionId) {
        setCorrectId(data.correctOptionId);
        setExplanationHtml(data.explanationHtml || null);
        setShowExplanationDrawer(true);
      }
    } finally {
      setCheckingMcq(false);
    }
  };

  const handleResetMcq = () => {
    setSelectedId(null);
    setWrongIds([]);
    setCorrectId(null);
    setExplanationHtml(null);
    setShowExplanationDrawer(false);
  };

  const sendAiPrompt = async (text: string) => {
    if (!text.trim() || aiLoading || isPreview) return;
    setAiError('');
    const userMsg: AiMsg = { id: crypto.randomUUID(), role: 'user', content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setPromptInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'AI assistant unavailable.');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
            provider: data.provider,
            model: data.model,
          },
        ]);
      }
    } catch {
      setAiError('Network error while contacting AI assistant.');
    } finally {
      setAiLoading(false);
    }
  };

  const reportAiMessage = async (msg: AiMsg) => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AI_INACCURACY_REPORT',
        questionId: question.id,
        message: 'Student flagged AI assistant response as inaccurate.',
        aiMessageDump: msg.content,
      }),
    });
    setReportedIds((prev) => ({ ...prev, [msg.id]: 'reported' }));
  };

  const quickActions = [
    'Explain this question',
    'Answer this (study guide)',
    'Simplify',
    'Give more detail',
    ...(question.category === 'MCQ' ? ['Explain why each MCQ option is right or wrong'] : []),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Question Card */}
      <div className="lg:col-span-7 xl:col-span-8 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Metadata Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy-900 text-white">
              Q{question.displayNumber} • {question.category}
            </span>
            {question.category === 'MCQ' && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  question.mcqAnswerStatus === 'ANSWERED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {question.mcqAnswerStatus === 'ANSWERED' ? 'Answered' : 'Unanswered'}
              </span>
            )}
            {question.examYear && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-navy-800">
                {question.examYear}
              </span>
            )}
          </div>

          {question.totalMarks != null && (
            <span className="text-sm font-bold text-navy-800 bg-blue-50 px-3 py-1 rounded-lg">
              [{question.totalMarks} {question.totalMarks === 1 ? 'mark' : 'marks'}]
            </span>
          )}
        </div>

        {/* Question Stem */}
        <div
          className="prose prose-slate max-w-none text-base sm:text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: question.stemHtml }}
        />

        {/* Nested Sections for SAQ / Essay (Marks only, NO model answers) */}
        {question.sections.length > 0 && (
          <div className="space-y-4 pt-2">
            {question.sections.map((sec) => (
              <div
                key={sec.id}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-2.5">
                  <span className="font-bold text-navy-900">{sec.label}</span>
                  <div
                    className="prose prose-slate max-w-none text-sm sm:text-base"
                    dangerouslySetInnerHTML={{ __html: sec.contentHtml }}
                  />
                </div>
                {sec.marks != null && (
                  <span className="text-xs font-bold text-navy-800 whitespace-nowrap shrink-0">
                    [{sec.marks} {sec.marks === 1 ? 'mark' : 'marks'}]
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MCQ Options */}
        {question.category === 'MCQ' && (
          <div className="space-y-3 pt-2">
            {question.options.map((opt) => {
              const isCorrect = correctId === opt.id;
              const isWrong = wrongIds.includes(opt.id);
              const isNeutralSelected =
                question.mcqAnswerStatus === 'UNANSWERED' && selectedId === opt.id;

              let btnStyle = 'border-slate-200 bg-white hover:border-medblue-500 hover:bg-blue-50/40';
              if (isCorrect) {
                btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30';
              } else if (isWrong) {
                btnStyle = 'border-red-600 bg-red-50 text-red-950 animate-wrong-shake';
              } else if (isNeutralSelected) {
                btnStyle = 'border-medblue-600 bg-blue-50 text-navy-900';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start justify-between gap-3 ${btnStyle}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {opt.label}
                    </span>
                    <div
                      className="text-sm sm:text-base"
                      dangerouslySetInnerHTML={{ __html: opt.contentHtml }}
                    />
                  </div>
                  {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
                  {isWrong && <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                </button>
              );
            })}

            {/* Unanswered MCQ Neutral Notice */}
            {question.mcqAnswerStatus === 'UNANSWERED' && selectedId && (
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-sm text-slate-700 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-600 shrink-0" />
                <span>
                  No official answer is available for this question. Use the AI revision assistant for a suggested breakdown.
                </span>
              </div>
            )}

            {/* Answered MCQ Controls */}
            {question.mcqAnswerStatus === 'ANSWERED' && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {!correctId && wrongIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRevealAnswer}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-navy-800 text-white hover:bg-navy-700"
                  >
                    Show Answer
                  </button>
                )}
                {(selectedId || wrongIds.length > 0 || correctId) && (
                  <button
                    type="button"
                    onClick={handleResetMcq}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Question
                  </button>
                )}
              </div>
            )}

            {/* Slide-in / Pop-out Explanation Panel when Correct Option Chosen */}
            {showExplanationDrawer && correctId && (
              <div
                role="region"
                aria-label="Official Answer Explanation"
                className="mt-4 p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-emerald-950 space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Correct
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowExplanationDrawer(false)}
                    className="text-xs text-emerald-800 underline"
                  >
                    Dismiss
                  </button>
                </div>
                {explanationHtml ? (
                  <div
                    className="prose prose-sm prose-emerald max-w-none"
                    dangerouslySetInnerHTML={{ __html: explanationHtml }}
                  />
                ) : (
                  <p className="text-sm text-emerald-900">Correct option selected.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Guest prompt & Question Feedback Link */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          {!isLoggedIn && !isPreview ? (
            <span>
              <Link href="/login" className="text-medblue-600 font-semibold underline">
                Log In
              </Link>{' '}
              to save your attempt history and progress analytics.
            </span>
          ) : (
            <span>Progress tracked in your student dashboard.</span>
          )}

          <Link
            href={`/feedback?questionId=${question.id}`}
            className="inline-flex items-center gap-1.5 font-semibold text-navy-800 hover:text-medblue-600"
          >
            <Flag className="w-3.5 h-3.5" />
            Feedback / Report an issue
          </Link>
        </div>
      </div>

      {/* SECTION 5: AI REVISION ASSISTANT PANEL (Desktop side panel / Mobile collapsible bottom sheet) */}
      <aside className="lg:col-span-5 xl:col-span-4 bg-navy-950 border border-medblue-400/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <button
          type="button"
          onClick={() => setAiOpenMobile((o) => !o)}
          className="w-full px-5 py-4 bg-navy-800/80 border-b border-medblue-400/20 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-medblue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">AI Revision Assistant</h2>
              <p className="text-[11px] text-blue-200/80">Structured exam study guide</p>
            </div>
          </div>
          <span className="lg:hidden text-blue-200">
            {aiOpenMobile ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </span>
        </button>

        <div className={`${aiOpenMobile ? 'flex' : 'hidden'} lg:flex flex-col p-4 space-y-4`}>
          {/* Mandatory Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              AI-generated educational assistance, not an official answer or marking scheme. Not for clinical patient care.
            </span>
          </div>

          {isPreview && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-xs text-red-200">
              Preview Mode: Sending AI prompts is disabled so no usage charges are incurred.
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((qa) => (
              <button
                key={qa}
                type="button"
                disabled={aiLoading || isPreview}
                onClick={() => sendAiPrompt(qa)}
                className="text-xs px-3 py-1.5 rounded-full bg-navy-800 hover:bg-medblue-600 disabled:opacity-50 text-blue-100 border border-medblue-400/30 transition-colors"
              >
                {qa}
              </button>
            ))}
          </div>

          {/* Conversation Feed */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="text-xs text-blue-200/70 py-6 text-center">
                Select a quick action above or ask a specific question about this item.
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-medblue-600/30 border border-medblue-400/40 text-white ml-4'
                      : 'bg-navy-900 border border-white/10 text-blue-50'
                  }`}
                >
                  {m.content}
                  {m.role === 'assistant' && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-300/70">
                      <span>AI-generated study help ({m.provider})</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setReportedIds((p) => ({ ...p, [m.id]: 'up' }))}
                          aria-label="Helpful"
                          className={reportedIds[m.id] === 'up' ? 'text-emerald-400' : 'hover:text-white'}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => reportAiMessage(m)}
                          aria-label="Report inaccurate AI answer"
                          className="inline-flex items-center gap-1 hover:text-red-300"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{reportedIds[m.id] === 'reported' ? 'Reported' : 'Report'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {aiLoading && (
              <div className="text-xs text-medblue-400 animate-pulse px-2">
                Generating structured medical explanation...
              </div>
            )}
            {aiError && (
              <div className="text-xs text-red-300 bg-red-950/60 border border-red-500/40 p-2.5 rounded-lg">
                {aiError}
              </div>
            )}
          </div>

          {/* Free-text follow-up */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendAiPrompt(promptInput);
            }}
            className="flex items-center gap-2 pt-2 border-t border-white/10"
          >
            <input
              type="text"
              disabled={aiLoading || isPreview}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask a follow-up..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-navy-900 border border-white/15 text-xs sm:text-sm text-white placeholder:text-blue-300/50 focus:outline-none focus:ring-1 focus:ring-medblue-400"
            />
            <button
              type="submit"
              disabled={aiLoading || isPreview || !promptInput.trim()}
              aria-label="Send prompt"
              className="p-2.5 rounded-xl bg-medblue-500 hover:bg-medblue-600 disabled:opacity-40 text-white"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
