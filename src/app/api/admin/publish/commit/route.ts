import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getValidAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.isPreview) return NextResponse.json({ error: 'Blocked in Preview Mode' }, { status: 403 });

  const { token, questionIds, typedConfirmation } = await req.json();
  if (!token || !Array.isArray(questionIds)) {
    return NextResponse.json({ error: 'Invalid confirmation payload' }, { status: 400 });
  }

  if (questionIds.length > 1 && typedConfirmation !== 'PUBLISH') {
    return NextResponse.json({ error: 'Type PUBLISH to confirm bulk operation.' }, { status: 400 });
  }

  const record = await prisma.publishToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date() || record.adminId !== session.userId) {
    return NextResponse.json({ error: 'Confirmation token expired or invalid.' }, { status: 403 });
  }

  const expectedIds = JSON.stringify((record.questionIds as string[]).slice().sort());
  const providedIds = JSON.stringify(questionIds.slice().sort());
  if (expectedIds !== providedIds) {
    return NextResponse.json({ error: 'Question set mismatch. Re-open confirmation dialog.' }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.publishToken.update({ where: { id: record.id }, data: { used: true } });

    if (record.action === 'PUBLISH') {
      await tx.question.updateMany({
        where: { id: { in: questionIds } },
        data: { status: 'PUBLISHED', publishedAt: new Date(), isUnclassified: false },
      });
    } else if (record.action === 'UNPUBLISH') {
      await tx.question.updateMany({
        where: { id: { in: questionIds } },
        data: { status: 'DRAFT' },
      });
    } else if (record.action === 'DELETE') {
      await tx.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    }

    await tx.activityLog.create({
      data: {
        actorId: session.userId,
        action: `QUESTIONS_${record.action}`,
        entity: 'Question',
        metadata: { count: questionIds.length, questionIds },
      },
    });
  });

  return NextResponse.json({ ok: true, count: questionIds.length });
}
