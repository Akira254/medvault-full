import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getStudentSession } from '@/lib/auth';
import { QuestionPracticeClient } from '@/components/QuestionPracticeClient';

export default async function QuestionDetailPage({ params }: { params: { id: string } }) {
  const question = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      discipline: { select: { name: true, slug: true } },
      subdiscipline: { select: { name: true, slug: true } },
      topic: { select: { name: true, slug: true } },
      sections: { orderBy: { orderIndex: 'asc' } },
      options: { orderBy: { orderIndex: 'asc' }, select: { id: true, label: true, contentHtml: true } },
    },
  });

  if (!question || question.status !== 'PUBLISHED') {
    notFound();
  }

  const student = await getStudentSession();
  if (student) {
    await prisma.questionView.create({
      data: { userId: student.userId, questionId: question.id },
    }).catch(() => {});
  }

  // SECURITY: Never pass correctOptionId or explanationHtml to the initial client payload!
  const safeQuestion = {
    id: question.id,
    displayNumber: question.displayNumber,
    category: question.category,
    examYear: question.examYear,
    stemHtml: question.stemHtml,
    totalMarks: question.totalMarks,
    mcqAnswerStatus: question.mcqAnswerStatus,
    discipline: question.discipline,
    subdiscipline: question.subdiscipline,
    topic: question.topic,
    sections: question.sections,
    options: question.options,
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-blue-200 flex flex-wrap items-center gap-2">
        <Link href="/question-bank" className="hover:text-white">Question Bank</Link>
        {question.discipline && (
          <>
            <span>/</span>
            <Link href={`/subjects/${question.discipline.slug}`} className="hover:text-white">
              {question.discipline.name}
            </Link>
          </>
        )}
        {question.topic && (
          <>
            <span>/</span>
            <span className="text-white font-semibold">{question.topic.name}</span>
          </>
        )}
      </nav>

      <QuestionPracticeClient question={safeQuestion} isLoggedIn={Boolean(student)} />
    </div>
  );
}
