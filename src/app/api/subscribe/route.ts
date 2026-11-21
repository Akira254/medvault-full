import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';

const subSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().max(100).optional(),
  website: z.string().optional(), // Honeypot
  source: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = subSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid email' }, { status: 400 });
    }

    // Honeypot check
    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      return NextResponse.json({ ok: true, message: 'Check your inbox to confirm your subscription.' });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const confirmToken = crypto.randomBytes(24).toString('hex');

    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (existing && existing.status === 'ACTIVE') {
      return NextResponse.json({ ok: true, message: 'You are already subscribed to MedVault updates.' });
    }

    const sub = await prisma.subscriber.upsert({
      where: { email },
      update: {
        name: parsed.data.name?.trim() || existing?.name,
        status: 'PENDING',
        confirmToken,
        unsubscribedAt: null,
      },
      create: {
        email,
        name: parsed.data.name?.trim() || null,
        status: 'PENDING',
        confirmToken,
        source: parsed.data.source || 'homepage',
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/subscribe/confirm?token=${confirmToken}`;
    const unsubUrl = `${baseUrl}/api/subscribe/unsubscribe?token=${sub.unsubscribeToken}`;

    await sendMail({
      to: email,
      subject: 'Confirm your MedVault subscription',
      text: `Confirm your MedVault subscription: ${confirmUrl}\n\nUnsubscribe anytime: ${unsubUrl}`,
      html: `<p>Please confirm your subscription to <strong>MedVault</strong> updates:</p><p><a href="${confirmUrl}">Confirm Subscription</a></p><hr/><p style="font-size:12px;color:#666;">Don't want updates? <a href="${unsubUrl}">Unsubscribe in one click</a>.</p>`,
    });

    return NextResponse.json({
      ok: true,
      message: 'Confirmation email sent! Please click the link in your inbox to activate your subscription.',
    });
  } catch {
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
