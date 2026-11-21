import React from 'react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const [
    totalStudents,
    activeSubscribers,
    answeredMcqs,
    unansweredMcqs,
    zeroSearches,
    aiLogs,
    disciplines,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.question.count({ where: { category: 'MCQ', mcqAnswerStatus: 'ANSWERED' } }),
    prisma.question.count({ where: { category: 'MCQ', mcqAnswerStatus: 'UNANSWERED' } }),
    prisma.searchLog.findMany({
      where: { resultsCount: 0 },
      orderBy: { searchedAt: 'desc' },
      take: 15,
    }),
    prisma.aiUsageLog.aggregate({
      _sum: { promptTokens: true, completionTokens: true, estimatedCostUsd: true },
      _count: { id: true },
    }),
    prisma.discipline.findMany({
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-white">MedVault Operations &amp; Analytics</h1>
        <p className="text-xs text-gray-400">
          Live database metrics across students, MCQ key coverage, zero-result searches, and AI usage.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4">
          <p className="text-xs uppercase text-gray-400">Students</p>
          <p className="text-2xl font-extrabold text-white mt-1">{totalStudents}</p>
        </div>
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4">
          <p className="text-xs uppercase text-gray-400">Active Subscribers</p>
          <p className="text-2xl font-extrabold text-white mt-1">{activeSubscribers}</p>
        </div>
        <div className="bg-[#11151C] border border-emerald-700/50 rounded-xl p-4">
          <p className="text-xs uppercase text-emerald-400">MCQs: Answered / Unanswered</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {answeredMcqs} / {unansweredMcqs}
          </p>
        </div>
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4">
          <p className="text-xs uppercase text-gray-400">AI Calls &amp; Est. Cost</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {aiLogs._count.id} (${(aiLogs._sum.estimatedCostUsd ?? 0).toFixed(4)})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-bold text-white">Questions by Discipline</h2>
          {disciplines.length === 0 ? (
            <p className="text-xs text-gray-400">No disciplines created yet.</p>
          ) : (
            disciplines.map((d) => (
              <div
                key={d.id}
                className="flex justify-between text-xs text-gray-300 border-b border-gray-800/60 py-1.5"
              >
                <span>{d.name}</span>
                <span className="font-mono text-white">{d._count.questions}</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-bold text-white">Recent Zero-Result Searches</h2>
          {zeroSearches.length === 0 ? (
            <p className="text-xs text-gray-400">No zero-result searches logged.</p>
          ) : (
            zeroSearches.map((s) => (
              <div
                key={s.id}
                className="flex justify-between text-xs text-gray-300 border-b border-gray-800/60 py-1.5"
              >
                <span>“{s.query}”</span>
                <span className="text-gray-500">
                  {new Date(s.searchedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}