import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createStudentSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();
    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/username and password are required.' }, { status: 400 });
    }

    const lookup = String(identifier).trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: lookup }, { username: lookup }],
        role: 'STUDENT',
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json({ error: 'Account temporarily locked due to failed attempts. Try again later.' }, { status: 429 });
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      const failed = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null },
    });

    await createStudentSession({
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Log in failed.' }, { status: 500 });
  }
}
