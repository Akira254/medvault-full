// src/app/api/admin/subscribers/announcements/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SubscriberStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAdminActivity, requireAdminRole } from '@/lib/admin-server';

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdminRole(['SUPER_ADMIN', 'ADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const subject = String(body?.subject || '').trim();
    const message = String(body?.message || '').trim();
    const audience = body?.audience === 'ALL' ? 'ALL' : 'ACTIVE';

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const recipients = await prisma.subscriber.findMany({
      where: audience === 'ACTIVE' ? { status: SubscriberStatus.ACTIVE } : {},
      select: { email: true },
    });

    // Hook your mailer provider (Resend / SendGrid / Postmark / SMTP) here in production
    await recordAdminActivity({
      actorId: user?.id,
      action: 'SUBSCRIBER_ANNOUNCEMENT_QUEUED',
      entity: 'SUBSCRIBER',
      summary: `Queued announcement "${subject}" for ${recipients.length} (${audience}) subscriber(s)`,
      metadata: { subject, recipientCount: recipients.length, audience },
    });

    return NextResponse.json({
      queued: true,
      recipientCount: recipients.length,
    });
  } catch (err) {
    console.error('POST /api/admin/subscribers/announcements error:', err);
    return NextResponse.json({ error: 'Failed to queue announcement' }, { status: 500 });
  }
}