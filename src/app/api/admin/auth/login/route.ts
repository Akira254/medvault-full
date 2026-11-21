import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { prisma } from '@/lib/prisma';
import { createAdminSession } from '@/lib/auth';
import { sendMail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { email, username, password, totpCode } = await req.json();
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: 'Admin email, username, and password are all required.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = String(username).trim().toLowerCase();

    const admin = await prisma.user.findFirst({
      where: {
        email: cleanEmail,
        username: cleanUsername,
        role: { in: ['EDITOR', 'ADMIN', 'SUPER_ADMIN'] },
      },
    });

    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (!admin) {
      return NextResponse.json({ error: 'Invalid administrator credentials.' }, { status: 401 });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Admin account locked due to repeated failed attempts.' },
        { status: 429 }
      );
    }

    const valid = await bcrypt.compare(String(password), admin.passwordHash);
    if (!valid) {
      const failed = admin.failedLogins + 1;
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null,
        },
      });

      if (failed >= 3) {
        const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
        if (superAdmin) {
          await sendMail({
            to: superAdmin.email,
            subject: '[MedVault Security Alert] Repeated failed admin login attempts',
            text: `Repeated failed admin login attempts detected for ${cleanEmail} from IP ${ip}.`,
            html: `<p>Repeated failed admin login attempts detected for <strong>${cleanEmail}</strong> from IP <code>${ip}</code>.</p>`,
          }).catch(() => {});
        }
      }

      return NextResponse.json({ error: 'Invalid administrator credentials.' }, { status: 401 });
    }

    if (admin.totpEnabled && admin.totpSecret) {
      if (!totpCode || !authenticator.check(String(totpCode), admin.totpSecret)) {
        return NextResponse.json({ error: 'Invalid 2FA verification code.' }, { status: 401 });
      }
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: { failedLogins: 0, lockedUntil: null },
    });

    await createAdminSession(admin.id, ip, req.headers.get('user-agent') || undefined);

    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: 'ADMIN_LOGIN',
        entity: 'User',
        entityId: admin.id,
        ipAddress: ip,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Admin login failed.' }, { status: 500 });
  }
}
