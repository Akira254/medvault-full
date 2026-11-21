import { NextResponse } from 'next/server';
import { getValidAdminSession, revokeAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await getValidAdminSession();
  if (session) {
    await prisma.activityLog.create({
      data: {
        actorId: session.userId,
        action: 'ADMIN_LOGOUT',
        entity: 'User',
        entityId: session.userId,
      },
    }).catch(() => {});
  }
  await revokeAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('mv_admin_preview');
  return res;
}
