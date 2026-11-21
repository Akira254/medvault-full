import { NextResponse } from 'next/server';
import { getValidAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.adminSession.update({
    where: { id: session.id },
    data: { isPreview: true },
  });

  await prisma.activityLog.create({
    data: {
      actorId: session.userId,
      action: 'ENTER_PREVIEW_MODE',
      entity: 'AdminSession',
      entityId: session.id,
    },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('mv_admin_preview', '1', {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
  });
  return res;
}
