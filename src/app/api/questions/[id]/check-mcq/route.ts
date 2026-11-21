import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStudentSession } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { selectedOptionId, reveal, isPreview } = await req.json();

  const question = await prisma.question.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      category: true,
      status: true,
      mcqAnswerStatus: true,
      correctOptionId: true,
      explanationHtml: true,
    },
  });

  if (!question || question.category !== 'MCQ') {
    return NextResponse.json({ error: 'MCQ not found' }, { status: 404 });
  }

  if (question.mcqAnswerStatus !== 'ANSWERED' || !question.correctOptionId) {
    return NextResponse.json({ status: 'UNANSWERED' });
  }

  if (reveal) {
    return NextResponse.json({
      correctOptionId: question.correctOptionId,
      explanationHtml: question.explanationHtml,
    });
  }

  const isCorrect = selectedOptionId === question.correctOptionId;

  // Record attempt only for real logged-in students (NEVER in Admin Preview Mode)
  if (!isPreview) {
    const student = await getStudentSession();
    if (student && selectedOptionId) {
      await prisma.mcqAttempt.create({
        data: {
          userId: student.userId,
          questionId: question.id,
          selectedOptionId,
          isCorrect,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    isCorrect,
    explanationHtml: isCorrect ? question.explanationHtml : null,
  });
}
