import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?subscribe=invalid', req.url));
  }

  const sub = await prisma.subscriber.findUnique({ where: { confirmToken: token } });
  if (!sub) {
    return NextResponse.redirect(new URL('/?subscribe=invalid', req.url));
  }

  await prisma.subscriber.update({
    where: { id: sub.id },
    data: {
      status: 'ACTIVE',
      confirmedAt: new Date(),
      confirmToken: null,
    },
  });

  return NextResponse.redirect(new URL('/?subscribe=confirmed', req.url));
}
