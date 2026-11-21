import React from 'react';
import { prisma } from '@/lib/prisma';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardOverview() {
  const [totalQuestions, publishedCount, draftCount, unclassifiedCount, openFeedbackCount, activeSubscribers] =
    await Promise.all([
      prisma.question.count(),
      prisma.question.count({ where: { status: 'PUBLISHED' } }),
      prisma.question.count({ where: { status: 'DRAFT' } }),
      prisma.question.count({ where: { isUnclassified: true } }),
      prisma.feedback.count({ where: { status: { in: ['NEW', 'IN_REVIEW'] } } }),
      prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
    ]);

  return (
    <div className="space-y-6">
      {/* Split Red/Green Banner (Section 7A) */}
      <div className="admin-banner-split rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 shrink-0" />
          <div>
            <h1 className="text-xl font-extrabold">Editorial &amp; Operations Overview</h1>
            <p className="text-xs opacity-90">
              All imports land as Draft. Explicit publish confirmation is required before public visibility.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-5">
          <p className="text-xs uppercase text-gray-400">Total Questions in Vault</p>
          <p className="text-3xl font-extrabold text-white mt-1">{totalQuestions}</p>
        </div>
        <div className="bg-[#11151C] border border-[#0E8A3E]/50 rounded-xl p-5">
          <p className="text-xs uppercase text-emerald-400">Live Published</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">{publishedCount}</p>
        </div>
        <div className="bg-[#11151C] border border-amber-500/40 rounded-xl p-5">
          <p className="text-xs uppercase text-amber-300">Drafts Pending Review</p>
          <p className="text-3xl font-extrabold text-amber-300 mt-1">{draftCount}</p>
        </div>
        <div className="bg-[#11151C] border border-[#B3122B]/50 rounded-xl p-5">
          <p className="text-xs uppercase text-red-400">Unclassified Holding Queue</p>
          <p className="text-3xl font-extrabold text-red-400 mt-1">{unclassifiedCount}</p>
        </div>
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-5">
          <p className="text-xs uppercase text-gray-400">Open Feedback &amp; AI Flags</p>
          <p className="text-3xl font-extrabold text-white mt-1">{openFeedbackCount}</p>
        </div>
        <div className="bg-[#11151C] border border-gray-800 rounded-xl p-5">
          <p className="text-xs uppercase text-gray-400">Active Double-Opt-In Subscribers</p>
          <p className="text-3xl font-extrabold text-white mt-1">{activeSubscribers}</p>
        </div>
      </div>
    </div>
  );
}
