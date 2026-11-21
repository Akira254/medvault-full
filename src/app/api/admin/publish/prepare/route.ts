import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getValidAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.isPreview) return NextResponse.json({ error: 'Blocked in Preview Mode' }, { status: 403 });

  const { questionIds, action } = await req.json();
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions selected' }, { status: 400 });
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { discipline: true, subdiscipline: true, topic: true },
  });

  const warnings: string[] = [];
  const validIds: string[] = [];

  for (const q of questions) {
    if (action === 'PUBLISH' && (!q.disciplineId || !q.topicId || !q.category)) {
      warnings.push(`Q${q.displayNumber}: Missing required discipline, topic, or category (cannot publish).`);
      continue;
    }
    if (action === 'PUBLISH' && q.category === 'MCQ' && q.mcqAnswerStatus !== 'ANSWERED') {
      warnings.push(`Q${q.displayNumber}: MCQ has no answer key (will publish as Unanswered).`);
    }
    validIds.push(q.id);
  }

  if (validIds.length === 0) {
    return NextResponse.json(
      { error: 'None of the selected questions meet requirements for publishing.', warnings },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(24).toString('hex');
  await prisma.publishToken.create({
    data: {
      token,
      action: action || 'PUBLISH',
      questionIds: validIds.sort(),
      adminId: session.userId,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2-minute one-time token
    },
  });

  return NextResponse.json({
    token,
    count: validIds.length,
    warnings,
    items: questions
      .filter((q) => validIds.includes(q.id))
      .map((q) => ({
        id: q.id,
        displayNumber: q.displayNumber,
        title: q.stemPlain.slice(0, 90),
        discipline: q.discipline?.name || '—',
        subdiscipline: q.subdiscipline?.name || '—',
        topic: q.topic?.name || '—',
        category: q.category,
        examYear: q.examYear,
      })),
  });
}
