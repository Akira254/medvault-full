import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getStudentSession } from '@/lib/auth';

const fbSchema = z.object({
  type: z.enum([
    'INCORRECT_OR_MISSING_ANSWER',
    'WRONG_OR_UNCLEAR_EXPLANATION',
    'TYPO_OR_FORMATTING',
    'WRONG_CLASSIFICATION',
    'FEATURE_SUGGESTION',
    'BUG_REPORT',
    'GENERAL_FEEDBACK',
    'AI_INACCURACY_REPORT',
  ]),
  message: z.string().min(5, 'Please provide at least 5 characters').max(2000),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  questionId: z.string().optional().nullable(),
  guestName: z.string().max(100).optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
  aiMessageDump: z.string().max(8000).optional().nullable(),
  website: z.string().optional(), // Honeypot
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = fbSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid feedback' }, { status: 400 });
    }

    if (parsed.data.website) {
      return NextResponse.json({ ok: true });
    }

    const student = await getStudentSession();
    if (!student && !parsed.data.guestEmail && parsed.data.type !== 'AI_INACCURACY_REPORT') {
      return NextResponse.json({ error: 'Please Log In or provide your email address.' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        type: parsed.data.type,
        message: parsed.data.message.trim(),
        rating: parsed.data.rating ?? null,
        questionId: parsed.data.questionId || null,
        userId: student?.userId || null,
        guestName: student ? null : parsed.data.guestName || null,
        guestEmail: student ? null : parsed.data.guestEmail || null,
        aiMessageDump: parsed.data.aiMessageDump || null,
      },
    });

    return NextResponse.json({ ok: true, id: feedback.id });
  } catch {
    return NextResponse.json({ error: 'Could not submit feedback.' }, { status: 500 });
  }
}
