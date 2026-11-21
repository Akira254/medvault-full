import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getStudentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const student = await getStudentSession();
  if (!student) {
    redirect('/login');
  }

  const [viewsCount, attempts, totalPublishedMcqs, recentViews, feedbacks] = await Promise.all([
    prisma.questionView.count({ where: { userId: student.userId } }),
    prisma.mcqAttempt.findMany({ where: { userId: student.userId } }),
    prisma.question.count({ where: { status: 'PUBLISHED', category: 'MCQ' } }),
    prisma.questionView.findMany({
      where: { userId: student.userId },
      orderBy: { viewedAt: 'desc' },
      take: 6,
      include: { question: { include: { discipline: true } } },
    }),
    prisma.feedback.findMany({
      where: { userId: student.userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const distinctAttemptedIds = new Set(attempts.map((a) => a.questionId));
  const gradedAttempts = attempts.filter((a) => a.isCorrect !== null);
  const correctCount = gradedAttempts.filter((a) => a.isCorrect === true).length;
  const accuracy = gradedAttempts.length > 0 ? Math.round((correctCount / gradedAttempts.length) * 100) : 0;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome back, {student.fullName}</h1>
          <p className="text-sm text-blue-200/80">Your personal revision progress and MCQ attempt analytics</p>
        </div>
        {recentViews[0] && (
          <Link
            href={`/question/${recentViews[0].questionId}`}
            className="px-5 py-2.5 rounded-full bg-medblue-500 hover:bg-medblue-600 text-white text-sm font-semibold"
          >
            Continue where you left off →
          </Link>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-5">
          <p className="text-xs uppercase text-blue-200/70">Questions Viewed</p>
          <p className="text-3xl font-extrabold text-white mt-1">{viewsCount}</p>
        </div>
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-5">
          <p className="text-xs uppercase text-blue-200/70">MCQs Attempted vs Not Attempted</p>
          <p className="text-3xl font-extrabold text-medblue-400 mt-1">
            {distinctAttemptedIds.size}{' '}
            <span className="text-sm font-normal text-blue-200/70">
              / {Math.max(0, totalPublishedMcqs - distinctAttemptedIds.size)} not attempted
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-5">
          <p className="text-xs uppercase text-blue-200/70">Accuracy (Answered MCQs)</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">{accuracy}%</p>
        </div>
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-5">
          <p className="text-xs uppercase text-blue-200/70">Feedback Submitted</p>
          <p className="text-3xl font-extrabold text-white mt-1">{feedbacks.length}</p>
        </div>
      </div>

      {/* Recently Viewed & Feedback Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Recently Viewed Questions</h2>
          {recentViews.length === 0 ? (
            <p className="text-sm text-blue-200/70">No questions viewed yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recentViews.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/question/${v.questionId}`}
                    className="block p-3 rounded-xl bg-navy-900 hover:bg-navy-800 border border-white/10 text-sm"
                  >
                    <span className="font-semibold text-medblue-400">
                      Q{v.question.displayNumber} ({v.question.category})
                    </span>{' '}
                    <span className="text-blue-100">{v.question.stemPlain.slice(0, 80)}...</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Your Feedback Submissions</h2>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-blue-200/70">You have not submitted any feedback reports.</p>
          ) : (
            <ul className="space-y-2.5">
              {feedbacks.map((f) => (
                <li key={f.id} className="p-3 rounded-xl bg-navy-900 border border-white/10 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-blue-100">{f.message}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-medblue-500/20 text-medblue-400 shrink-0">
                    {f.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
