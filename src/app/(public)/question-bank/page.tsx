import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SearchBar } from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: {
    disciplineId?: string;
    topicId?: string;
    category?: string;
    answerStatus?: string;
    year?: string;
    page?: string;
  };
}) {
  const page = Math.max(1, Number(searchParams.page || 1));
  const pageSize = 20;

  const where: any = { status: 'PUBLISHED' };
  if (searchParams.disciplineId) where.disciplineId = searchParams.disciplineId;
  if (searchParams.topicId) where.topicId = searchParams.topicId;
  if (searchParams.category && ['MCQ', 'SAQ', 'ESSAY'].includes(searchParams.category)) {
    where.category = searchParams.category;
  }
  if (searchParams.answerStatus && ['ANSWERED', 'UNANSWERED'].includes(searchParams.answerStatus)) {
    where.category = 'MCQ';
    where.mcqAnswerStatus = searchParams.answerStatus;
  }
  if (searchParams.year) where.examYear = Number(searchParams.year);

  const [questions, total, answeredMcqCount, unansweredMcqCount] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: [{ displayNumber: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { discipline: true, topic: true },
    }),
    prisma.question.count({ where }),
    prisma.question.count({
      where: { ...where, category: 'MCQ', mcqAnswerStatus: 'ANSWERED' },
    }),
    prisma.question.count({
      where: { ...where, category: 'MCQ', mcqAnswerStatus: 'UNANSWERED' },
    }),
  ]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Question Bank</h1>
          <p className="text-sm text-blue-200/80 mt-1">
            Filter published questions by category, topic, year, and MCQ answer status.
          </p>
        </div>
        <div className="w-full lg:w-[460px]">
          <SearchBar />
        </div>
      </div>

      {/* Context-Sensitive Filters (Never show empty MCQ status options) */}
      <div className="flex flex-wrap items-center gap-2 bg-navy-950/80 border border-medblue-400/20 p-4 rounded-2xl text-xs">
        <Link
          href="/question-bank"
          className={`px-3.5 py-1.5 rounded-full font-semibold ${
            !searchParams.category && !searchParams.answerStatus
              ? 'bg-medblue-500 text-white'
              : 'bg-navy-800 text-blue-200 hover:text-white'
          }`}
        >
          All Categories ({total})
        </Link>
        {(['MCQ', 'SAQ', 'ESSAY'] as const).map((cat) => (
          <Link
            key={cat}
            href={`/question-bank?category=${cat}`}
            className={`px-3.5 py-1.5 rounded-full font-semibold ${
              searchParams.category === cat
                ? 'bg-medblue-500 text-white'
                : 'bg-navy-800 text-blue-200 hover:text-white'
            }`}
          >
            {cat}
          </Link>
        ))}

        {answeredMcqCount > 0 && (
          <Link
            href="/question-bank?category=MCQ&answerStatus=ANSWERED"
            className={`px-3.5 py-1.5 rounded-full font-semibold ${
              searchParams.answerStatus === 'ANSWERED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            Answered MCQs ({answeredMcqCount})
          </Link>
        )}

        {unansweredMcqCount > 0 && (
          <Link
            href="/question-bank?category=MCQ&answerStatus=UNANSWERED"
            className={`px-3.5 py-1.5 rounded-full font-semibold ${
              searchParams.answerStatus === 'UNANSWERED'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-800 text-slate-300 border border-slate-600'
            }`}
          >
            Unanswered MCQs ({unansweredMcqCount})
          </Link>
        )}
      </div>

      {/* Question List */}
      {questions.length === 0 ? (
        <div className="rounded-2xl border border-medblue-400/20 bg-navy-950/70 p-12 text-center space-y-2">
          <h2 className="text-lg font-semibold text-white">No published questions match your current filter</h2>
          <p className="text-sm text-blue-200/80">
            Questions appear here once curated and explicitly published by an administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <Link
              key={q.id}
              href={`/question/${q.id}`}
              className="block rounded-2xl bg-white text-slate-900 p-6 shadow-md hover:shadow-xl border border-slate-200 hover:border-medblue-500 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-navy-900 text-white">
                    Q{q.displayNumber} • {q.category}
                  </span>
                  {q.category === 'MCQ' && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        q.mcqAnswerStatus === 'ANSWERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {q.mcqAnswerStatus === 'ANSWERED' ? 'Answered' : 'Unanswered'}
                    </span>
                  )}
                  {q.discipline && (
                    <span className="text-xs font-medium text-medblue-700">{q.discipline.name}</span>
                  )}
                  {q.topic && <span className="text-xs text-slate-500">• {q.topic.name}</span>}
                </div>
                {q.totalMarks != null && (
                  <span className="text-xs font-bold text-navy-800">[{q.totalMarks} marks]</span>
                )}
              </div>
              <p className="text-sm sm:text-base text-slate-800 line-clamp-2">{q.stemPlain}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
