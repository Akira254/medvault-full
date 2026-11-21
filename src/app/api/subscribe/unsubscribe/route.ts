import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/?subscribe=invalid', req.url));
  }

  const sub = await prisma.subscriber.findUnique({ where: { unsubscribeToken: token } });
  if (sub) {
    await prisma.subscriber.update({
      where: { id: sub.id },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date(),
      },
    });
  }

  return NextResponse.redirect(new URL('/?subscribe=unsubscribed', req.url));
}
