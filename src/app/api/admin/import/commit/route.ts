import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getValidAdminSession } from '@/lib/auth';
import {
  getNextDisplayNumber,
  logAdminActivity,
  sanitizeCell,
  sanitizeRichHtml,
} from '@/lib/admin-utils';
import { McqAnswerStatus, QuestionCategory, QuestionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [batches, templates] = await Promise.all([
    prisma.importBatch.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
    prisma.mappingTemplate.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  return NextResponse.json({ batches, templates });
}

export async function POST(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Save reusable column mapping template
  if (body?.action === 'SAVE_TEMPLATE') {
    const name = String(body?.name ?? '').trim();
    if (!name || !body?.mapping) {
      return NextResponse.json({ error: 'Template name and mapping are required' }, { status: 400 });
    }
    const tpl = await prisma.mappingTemplate.upsert({
      where: { name },
      update: { mapping: body.mapping },
      create: { name, mapping: body.mapping },
    });
    return NextResponse.json({ template: tpl });
  }

  // Commit approved import rows
  const fileName = String(body?.fileName ?? 'upload');
  const fileType = String(body?.fileType ?? 'csv');
  const rows = Array.isArray(body?.rows) ? body.rows : [];
  const mappingConfig = body?.mappingConfig ?? null;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows to commit' }, { status: 400 });
  }

  const [disciplines, subdisciplines, topics, existingQuestions] = await Promise.all([
    prisma.discipline.findMany(),
    prisma.subdiscipline.findMany(),
    prisma.topic.findMany(),
    prisma.question.findMany({ select: { stemPlain: true } }),
  ]);

  const discMap = new Map(disciplines.map((d) => [d.name.toLowerCase(), d.id]));
  const subMap = new Map(subdisciplines.map((s) => [s.name.toLowerCase(), s.id]));
  const topicMap = new Map(topics.map((t) => [t.name.toLowerCase(), t.id]));
  const seenStems = new Set(existingQuestions.map((q) => q.stemPlain.toLowerCase()));

  let importedCount = 0;
  let rejectedCount = 0;
  let duplicateCount = 0;
  let unclassifiedCount = 0;
  const errorReport: Array<{ row: number; reason: string }> = [];

  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      fileType,
      totalRows: rows.length,
      mappingConfig,
      createdById: session.user.id,
    },
  });

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.rejected) {
      rejectedCount += 1;
      errorReport.push({ row: i + 1, reason: 'Rejected by administrator in preview' });
      continue;
    }

    const stemPlain = sanitizeCell(r.stemPlain);
    if (!stemPlain) {
      rejectedCount += 1;
      errorReport.push({ row: i + 1, reason: 'Empty question stem' });
      continue;
    }

    if (seenStems.has(stemPlain.toLowerCase())) {
      duplicateCount += 1;
      if (!r.allowDuplicate) {
        rejectedCount += 1;
        errorReport.push({ row: i + 1, reason: 'Duplicate question stem detected' });
        continue;
      }
    }
    seenStems.add(stemPlain.toLowerCase());

    const rawCat = String(r.category ?? 'MCQ').toUpperCase();
    const category: QuestionCategory =
      rawCat === 'SAQ' || rawCat === 'ESSAY' ? (rawCat as QuestionCategory) : 'MCQ';

    const disciplineId =
      r.disciplineId || discMap.get(String(r.discipline ?? '').toLowerCase()) || null;
    const subdisciplineId =
      r.subdisciplineId || subMap.get(String(r.subdiscipline ?? '').toLowerCase()) || null;
    const topicId =
      r.topicId || topicMap.get(String(r.topic ?? '').toLowerCase()) || null;
    const isUnclassified = !disciplineId || !topicId;

    const displayNumber = await getNextDisplayNumber(topicId, category);
    const examYear = r.examYear ? Number(r.examYear) : null;
    const totalMarks = r.marks ? Number(r.marks) : null;

    const optionEntries = [
      { label: 'A', text: sanitizeCell(r.optionA) },
      { label: 'B', text: sanitizeCell(r.optionB) },
      { label: 'C', text: sanitizeCell(r.optionC) },
      { label: 'D', text: sanitizeCell(r.optionD) },
      { label: 'E', text: sanitizeCell(r.optionE) },
    ].filter((o) => o.text.length > 0);

    const answerLetter = String(r.correctAnswer ?? '').trim().toUpperCase();

    await prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          displayNumber,
          category,
          status: QuestionStatus.DRAFT,
          disciplineId,
          subdisciplineId,
          topicId,
          examYear: examYear && Number.isFinite(examYear) ? examYear : null,
          stemPlain,
          stemHtml: sanitizeRichHtml(`<p>${stemPlain}</p>`),
          totalMarks: category !== 'MCQ' && totalMarks && Number.isFinite(totalMarks) ? totalMarks : null,
          mcqAnswerStatus: category === 'MCQ' ? McqAnswerStatus.UNANSWERED : null,
          explanationHtml:
            category === 'MCQ' && r.explanation
              ? sanitizeRichHtml(`<p>${sanitizeCell(r.explanation)}</p>`)
              : null,
          isUnclassified,
          importBatchId: batch.id,
        },
      });

      if (category === 'MCQ' && optionEntries.length > 0) {
        let correctId: string | null = null;
        for (let idx = 0; idx < optionEntries.length; idx++) {
          const opt = await tx.mcqOption.create({
            data: {
              questionId: q.id,
              label: optionEntries[idx].label,
              contentHtml: sanitizeRichHtml(`<p>${optionEntries[idx].text}</p>`),
              orderIndex: idx,
            },
          });
          if (optionEntries[idx].label === answerLetter) {
            correctId = opt.id;
          }
        }

        if (correctId) {
          await tx.question.update({
            where: { id: q.id },
            data: {
              correctOptionId: correctId,
              mcqAnswerStatus: McqAnswerStatus.ANSWERED,
            },
          });
        }
      }
    });

    importedCount += 1;
    if (isUnclassified) unclassifiedCount += 1;
  }

  const finalized = await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      importedCount,
      rejectedCount,
      duplicateCount,
      unclassifiedCount,
      errorReport,
    },
  });

  await logAdminActivity({
    actorId: session.user.id,
    action: 'IMPORT_BATCH_COMMIT',
    entity: 'ImportBatch',
    entityId: finalized.id,
    metadata: { fileName, importedCount, rejectedCount, duplicateCount, unclassifiedCount },
  });

  return NextResponse.json({ batch: finalized });
}