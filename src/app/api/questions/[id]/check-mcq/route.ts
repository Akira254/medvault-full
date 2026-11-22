import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getValidAdminSession } from '@/lib/auth';
import {
  getNextDisplayNumber,
  htmlToPlain,
  logAdminActivity,
  renumberTopicCategory,
  sanitizeRichHtml,
} from '@/lib/admin-utils';
import { McqAnswerStatus, QuestionCategory, QuestionStatus } from '@prisma/client';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as QuestionStatus | null;
  const category = searchParams.get('category') as QuestionCategory | null;
  const disciplineId = searchParams.get('disciplineId');
  const topicId = searchParams.get('topicId');
  const unclassified = searchParams.get('unclassified') === 'true';

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (disciplineId) where.disciplineId = disciplineId;
  if (topicId) where.topicId = topicId;
  if (unclassified) where.isUnclassified = true;

  const questions = await prisma.question.findMany({
    where,
    orderBy: [{ topicId: 'asc' }, { category: 'asc' }, { displayNumber: 'asc' }],
    take: 200,
    include: {
      discipline: { select: { id: true, name: true } },
      subdiscipline: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      options: { orderBy: { orderIndex: 'asc' } },
      sections: { orderBy: { orderIndex: 'asc' } },
      _count: { select: { feedbacks: true } },
    },
  });

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getValidAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please log in to your admin session first.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const category = (body?.category as QuestionCategory) || 'MCQ';
    const stemHtml = sanitizeRichHtml(String(body?.stemHtml ?? ''));
    const stemPlain = htmlToPlain(stemHtml);

    if (!stemPlain) {
      return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    const requestedStatus =
      body?.status === QuestionStatus.PUBLISHED || body?.status === 'PUBLISHED'
        ? QuestionStatus.PUBLISHED
        : QuestionStatus.DRAFT;

    const disciplineId = body?.disciplineId ? String(body.disciplineId) : null;
    const subdisciplineId = body?.subdisciplineId ? String(body.subdisciplineId) : null;
    const topicId = body?.topicId ? String(body.topicId) : null;
    const examYear = body?.examYear ? Number(body.examYear) : null;
    const totalMarks = body?.totalMarks ? Number(body.totalMarks) : null;
    const isUnclassified = !disciplineId || !topicId;

    if (requestedStatus === QuestionStatus.PUBLISHED && isUnclassified) {
      return NextResponse.json(
        { error: 'Assign both Discipline and Topic before publishing a question.' },
        { status: 400 }
      );
    }

    const displayNumber = await getNextDisplayNumber(topicId, category);

    // MCQ options & optional verified key
    const rawOptions = Array.isArray(body?.options) ? body.options : [];
    const correctOptionIndex =
      typeof body?.correctOptionIndex === 'number' && body.correctOptionIndex >= 0
        ? body.correctOptionIndex
        : null;

    // SAQ / Essay sections (marks only, NO answers)
    const rawSections = Array.isArray(body?.sections) ? body.sections : [];

    const created = await prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          displayNumber,
          category,
          status: requestedStatus,
          publishedAt: requestedStatus === QuestionStatus.PUBLISHED ? new Date() : null,
          disciplineId,
          subdisciplineId,
          topicId,
          examYear: examYear && Number.isFinite(examYear) ? examYear : null,
          stemHtml,
          stemPlain,
          totalMarks:
            category !== 'MCQ' && totalMarks && Number.isFinite(totalMarks) ? totalMarks : null,
          mcqAnswerStatus:
            category === 'MCQ'
              ? correctOptionIndex !== null
                ? McqAnswerStatus.ANSWERED
                : McqAnswerStatus.UNANSWERED
              : null,
          explanationHtml:
            category === 'MCQ' && body?.explanationHtml
              ? sanitizeRichHtml(String(body.explanationHtml))
              : null,
          isUnclassified,
        },
      });

      if (category === 'MCQ' && rawOptions.length > 0) {
        let resolvedCorrectOptionId: string | null = null;
        for (let i = 0; i < rawOptions.length; i++) {
          const optHtml = sanitizeRichHtml(String(rawOptions[i]?.contentHtml ?? ''));
          if (!htmlToPlain(optHtml)) continue;
          const opt = await tx.mcqOption.create({
            data: {
              questionId: q.id,
              label: String(rawOptions[i]?.label || String.fromCharCode(65 + i)),
              contentHtml: optHtml,
              orderIndex: i,
            },
          });
          if (correctOptionIndex === i) {
            resolvedCorrectOptionId = opt.id;
          }
        }

        if (resolvedCorrectOptionId) {
          await tx.question.update({
            where: { id: q.id },
            data: {
              correctOptionId: resolvedCorrectOptionId,
              mcqAnswerStatus: McqAnswerStatus.ANSWERED,
            },
          });
        }
      }

      if ((category === 'SAQ' || category === 'ESSAY') && rawSections.length > 0) {
        for (let i = 0; i < rawSections.length; i++) {
          const secHtml = sanitizeRichHtml(String(rawSections[i]?.contentHtml ?? ''));
          if (!htmlToPlain(secHtml)) continue;
          await tx.questionSection.create({
            data: {
              questionId: q.id,
              label: String(rawSections[i]?.label || `(${String.fromCharCode(97 + i)})`),
              contentHtml: secHtml,
              marks: rawSections[i]?.marks ? Number(rawSections[i].marks) : null,
              orderIndex: i,
            },
          });
        }
      }

      return q;
    });

    await logAdminActivity({
      actorId: session.user.id,
      action:
        requestedStatus === QuestionStatus.PUBLISHED
          ? 'CREATE_AND_PUBLISH_QUESTION'
          : 'CREATE_QUESTION',
      entity: 'Question',
      entityId: created.id,
      metadata: { category, status: requestedStatus, isUnclassified },
    });

    return NextResponse.json({ question: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/questions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create question' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const action = String(body?.action ?? '');

  // 1. Bulk Assort / Reclassify + Auto-Renumber
  if (action === 'BULK_ASSORT') {
    const questionIds = Array.isArray(body?.questionIds) ? (body.questionIds as string[]) : [];
    const disciplineId = body?.disciplineId ? String(body.disciplineId) : null;
    const subdisciplineId = body?.subdisciplineId ? String(body.subdisciplineId) : null;
    const topicId = body?.topicId ? String(body.topicId) : null;
    const category = body?.category as QuestionCategory | undefined;
    const examYear =
      body?.examYear !== undefined && body?.examYear !== '' ? Number(body.examYear) : undefined;

    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'No questions selected' }, { status: 400 });
    }

    const existing = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, topicId: true, category: true, disciplineId: true },
    });

    const affectedBuckets = new Set<string>();
    for (const q of existing) {
      affectedBuckets.add(`${q.topicId ?? 'null'}::${q.category}`);
    }

    for (const q of existing) {
      const nextDisciplineId = disciplineId !== null ? disciplineId : q.disciplineId;
      const nextTopicId = topicId !== null ? topicId : q.topicId;
      const nextCategory = category ?? q.category;
      const isUnclassified = !nextDisciplineId || !nextTopicId;

      await prisma.question.update({
        where: { id: q.id },
        data: {
          ...(disciplineId !== null ? { disciplineId } : {}),
          ...(subdisciplineId !== null ? { subdisciplineId } : {}),
          ...(topicId !== null ? { topicId } : {}),
          ...(category ? { category } : {}),
          ...(examYear !== undefined ? { examYear } : {}),
          isUnclassified,
        },
      });

      affectedBuckets.add(`${nextTopicId ?? 'null'}::${nextCategory}`);
    }

    // Recompute sequential numbering in every affected topic+category bucket
    for (const key of Array.from(affectedBuckets)) {
      const [tId, cat] = key.split('::');
      await renumberTopicCategory(tId === 'null' ? null : tId, cat as QuestionCategory);
    }

    await logAdminActivity({
      actorId: session.user.id,
      action: 'BULK_ASSORT_QUESTIONS',
      entity: 'Question',
      metadata: { count: questionIds.length, disciplineId, topicId, category },
    });

    return NextResponse.json({ ok: true, updatedCount: questionIds.length });
  }

  // 2. Step 1 of Confirmed Bulk Publish / Unpublish / Delete
  if (action === 'REQUEST_PUBLISH_TOKEN') {
    const publishAction = String(body?.publishAction ?? 'PUBLISH') as
      | 'PUBLISH'
      | 'UNPUBLISH'
      | 'DELETE';
    const questionIds = Array.isArray(body?.questionIds) ? (body.questionIds as string[]) : [];

    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one question' }, { status: 400 });
    }

    if (publishAction === 'PUBLISH') {
      const incomplete = await prisma.question.count({
        where: {
          id: { in: questionIds },
          OR: [{ disciplineId: null }, { topicId: null }, { isUnclassified: true }],
        },
      });
      if (incomplete > 0) {
        return NextResponse.json(
          {
            error: `${incomplete} selected question(s) lack required Discipline or Topic classification and cannot be published.`,
          },
          { status: 400 }
        );
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const record = await prisma.publishToken.create({
      data: {
        token,
        action: publishAction,
        questionIds,
        adminId: session.user.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return NextResponse.json({
      token: record.token,
      count: questionIds.length,
      action: publishAction,
    });
  }

  // 3. Step 2: Execute Confirmed PublishToken
  if (action === 'EXECUTE_PUBLISH_TOKEN') {
    const token = String(body?.token ?? '');
    const record = await prisma.publishToken.findUnique({ where: { token } });

    if (!record || record.used || record.expiresAt < new Date() || record.adminId !== session.user.id) {
      return NextResponse.json({ error: 'Invalid or expired confirmation token' }, { status: 400 });
    }

    const ids = record.questionIds as string[];

    await prisma.$transaction(async (tx) => {
      await tx.publishToken.update({ where: { id: record.id }, data: { used: true } });

      if (record.action === 'PUBLISH') {
        await tx.question.updateMany({
          where: { id: { in: ids } },
          data: { status: QuestionStatus.PUBLISHED, publishedAt: new Date() },
        });
      } else if (record.action === 'UNPUBLISH') {
        await tx.question.updateMany({
          where: { id: { in: ids } },
          data: { status: QuestionStatus.DRAFT, publishedAt: null },
        });
      } else if (record.action === 'DELETE') {
        await tx.question.deleteMany({
          where: { id: { in: ids } },
        });
      }
    });

    await logAdminActivity({
      actorId: session.user.id,
      action: `BULK_${record.action}`,
      entity: 'Question',
      metadata: { count: ids.length, questionIds: ids },
    });

    return NextResponse.json({ ok: true, count: ids.length, action: record.action });
  }

  // 4. Single question status or MCQ key update
  if (action === 'UPDATE_SINGLE') {
    const id = String(body?.id ?? '');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (body?.status) {
      if (body.status === 'PUBLISHED') {
        const q = await prisma.question.findUnique({ where: { id } });
        if (!q?.disciplineId || !q?.topicId || q.isUnclassified) {
          return NextResponse.json(
            { error: 'Assign Discipline and Topic before publishing.' },
            { status: 400 }
          );
        }
        data.publishedAt = new Date();
      }
      data.status = body.status;
    }

    if (body?.correctOptionId !== undefined) {
      data.correctOptionId = body.correctOptionId || null;
      data.mcqAnswerStatus = body.correctOptionId
        ? McqAnswerStatus.ANSWERED
        : McqAnswerStatus.UNANSWERED;
    }

    if (body?.explanationHtml !== undefined) {
      data.explanationHtml = body.explanationHtml
        ? sanitizeRichHtml(String(body.explanationHtml))
        : null;
    }

    const updated = await prisma.question.update({ where: { id }, data });

    await logAdminActivity({
      actorId: session.user.id,
      action: 'UPDATE_QUESTION',
      entity: 'Question',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });

    return NextResponse.json({ question: updated });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}