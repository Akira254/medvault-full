import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createStudentSession } from '@/lib/auth';
import { sendMail } from '@/lib/mailer';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required').max(100),
  username: z
    .string()
    .min(3, 'Username must be 3-30 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username may contain letters, numbers, underscore and dot only'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const username = parsed.data.username.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      if (existing.email === email) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const verifyToken = crypto.randomBytes(24).toString('hex');

    const user = await prisma.user.create({
      data: {
        fullName: parsed.data.fullName.trim(),
        username,
        email,
        passwordHash,
        verifyToken,
      },
    });

    await createStudentSession({
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.fullName,
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify?token=${verifyToken}`;
    await sendMail({
      to: email,
      subject: 'Verify your MedVault account',
      text: `Welcome to MedVault, ${user.fullName}. Verify your email: ${verifyUrl}`,
      html: `<p>Welcome to <strong>MedVault</strong>, ${user.fullName}.</p><p><a href="${verifyUrl}">Click here to verify your email address</a></p>`,
    }).catch(() => {});

    return NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
