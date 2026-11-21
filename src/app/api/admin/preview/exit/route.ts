import { NextResponse } from 'next/server';
import { getValidAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await getValidAdminSession();
  if (session) {
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { isPreview: false },
    }).catch(() => {});

    await prisma.activityLog.create({
      data: {
        actorId: session.userId,
        action: 'EXIT_PREVIEW_MODE',
        entity: 'AdminSession',
        entityId: session.id,
      },
    }).catch(() => {});
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('mv_admin_preview');
  return res;
}
