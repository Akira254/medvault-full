import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getValidAdminSession } from '@/lib/auth';
import { logAdminActivity } from '@/lib/admin-utils';
import { FeedbackStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      question: { select: { id: true, stemPlain: true, category: true } },
      user: { select: { username: true, email: true } },
    },
  });

  return NextResponse.json({ feedbacks });
}

export async function PATCH(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = String(body?.id ?? '');
  const status = body?.status as FeedbackStatus | undefined;
  const internalNotes =
    typeof body?.internalNotes === 'string' ? body.internalNotes : undefined;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updated = await prisma.feedback.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(internalNotes !== undefined ? { internalNotes } : {}),
      assignedAdminId: session.user.id,
    },
  });

  await logAdminActivity({
    actorId: session.user.id,
    action: 'UPDATE_FEEDBACK',
    entity: 'Feedback',
    entityId: id,
    metadata: { status },
  });

  return NextResponse.json({ feedback: updated });
}