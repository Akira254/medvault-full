// src/app/api/admin/subscribers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SubscriberStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAdminActivity, requireAdminRole } from '@/lib/admin-server';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const statusParam = (req.nextUrl.searchParams.get('status') || 'ALL').trim().toUpperCase();
    const q = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase();

    const rows = await prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const filtered = rows.filter((r) => {
      const matchesStatus = statusParam === 'ALL' || r.status === statusParam;
      const matchesQuery =
        !q ||
        r.email.toLowerCase().includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.source || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    const summary = {
      total: rows.length,
      active: rows.filter((r) => r.status === SubscriberStatus.ACTIVE).length,
      pending: rows.filter((r) => r.status === SubscriberStatus.PENDING).length,
      unsubscribed: rows.filter((r) => r.status === SubscriberStatus.UNSUBSCRIBED).length,
    };

    return NextResponse.json({ subscribers: filtered, summary });
  } catch (err) {
    console.error('GET /api/admin/subscribers error:', err);
    return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const nextStatus = String(body?.status || '').trim().toUpperCase();

    if (
      !id ||
      !Object.values(SubscriberStatus).includes(nextStatus as SubscriberStatus)
    ) {
      return NextResponse.json(
        { error: 'Valid subscriber id and status (PENDING, ACTIVE, UNSUBSCRIBED) required' },
        { status: 400 }
      );
    }

    const statusEnum = nextStatus as SubscriberStatus;

    const updated = await prisma.subscriber.update({
      where: { id },
      data: {
        status: statusEnum,
        ...(statusEnum === SubscriberStatus.UNSUBSCRIBED
          ? { unsubscribedAt: new Date() }
          : {}),
        ...(statusEnum === SubscriberStatus.ACTIVE
          ? { confirmedAt: new Date(), unsubscribedAt: null }
          : {}),
      },
    });

    await recordAdminActivity({
      actorId: user?.id,
      action: 'SUBSCRIBER_STATUS_CHANGE',
      entity: 'SUBSCRIBER',
      entityId: id,
      summary: `Set subscriber ${updated.email} status to ${updated.status}`,
    });

    return NextResponse.json({ subscriber: updated });
  } catch (err) {
    console.error('PATCH /api/admin/subscribers error:', err);
    return NextResponse.json({ error: 'Failed to update subscriber' }, { status: 500 });
  }
}