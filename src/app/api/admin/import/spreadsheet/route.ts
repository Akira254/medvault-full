import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getValidAdminSession } from '@/lib/auth';
import { cleanRichHtml, neutralizeFormulaInjection, stripHtml } from '@/lib/sanitize';

export async function POST(req: NextRequest) {
  const session = await getValidAdminSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.isPreview) return NextResponse.json({ error: 'Blocked in Preview Mode' }, { status: 403 });

  try {
    const { fileName, fileType, rows, mappingConfig } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No approved rows provided' }, { status: 400 });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let unclassifiedCount = 0;
    const errors: Array<{ rowIndex: number; reason: string }> = [];

    const batch = await prisma.importBatch.create({
      data: {
        fileName: String(fileName || 'upload.xlsx'),
        fileType: String(fileType || 'xlsx'),
        totalRows: rows.length,
        mappingConfig: mappingConfig || {},
        createdById: session.userId,
      },
    });

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const safeStem = neutralizeFormulaInjection(r.stem || '');
        const stemHtml = cleanRichHtml(safeStem);
        const stemPlain = stripHtml(stemHtml);

        if (!stemPlain) {
          errors.push({ rowIndex: i + 1, reason: 'Empty question text' });
          continue;
        }

        // Duplicate check against existing DB
        const dup = await tx.question.findFirst({
          where: { stemPlain: { equals: stemPlain, mode: 'insensitive' } },
          select: { id: true },
        });
        if (dup) {
          duplicateCount++;
          errors.push({ rowIndex: i + 1, reason: 'Duplicate question detected' });
          continue;
        }

        const category = ['MCQ', 'SAQ', 'ESSAY'].includes(String(r.category).toUpperCase())
          ? (String(r.category).toUpperCase() as 'MCQ' | 'SAQ' | 'ESSAY')
          : 'MCQ';

        const isUnclassified = !r.disciplineId || !r.topicId || !r.category;
        if (isUnclassified) unclassifiedCount++;

        // Automatic numbering within topic + category
        const maxNum = await tx.question.aggregate({
          where: { topicId: r.topicId || null, category },
          _max: { displayNumber: true },
        });
        const displayNumber = (maxNum._max.displayNumber || 0) + 1;

        const created = await tx.question.create({
          data: {
            displayNumber,
            category,
            status: 'DRAFT', // Imported rows ALWAYS land as Draft, never Published
            disciplineId: r.disciplineId || null,
            subdisciplineId: r.subdisciplineId || null,
            topicId: r.topicId || null,
            examYear: r.examYear ? Number(r.examYear) : null,
            stemHtml,
            stemPlain,
            totalMarks: r.marks ? Number(r.marks) : null,
            mcqAnswerStatus: category === 'MCQ' ? 'UNANSWERED' : null,
            explanationHtml: r.explanation ? cleanRichHtml(neutralizeFormulaInjection(r.explanation)) : null,
            isUnclassified,
            importBatchId: batch.id,
          },
        });

        // Create MCQ options and link admin/document-supplied key if valid
        if (category === 'MCQ' && Array.isArray(r.options)) {
          let resolvedCorrectId: string | null = null;
          const targetKey = String(r.correctAnswer || '').trim().toUpperCase();

          for (let idx = 0; idx < r.options.length; idx++) {
            const optText = neutralizeFormulaInjection(r.options[idx]);
            if (!optText) continue;
            const label = String.fromCharCode(65 + idx); // A, B, C, D, E...
            const opt = await tx.mcqOption.create({
              data: {
                questionId: created.id,
                label,
                contentHtml: cleanRichHtml(optText),
                orderIndex: idx,
              },
            });
            if (targetKey && (targetKey === label || targetKey === optText.toUpperCase())) {
              resolvedCorrectId = opt.id;
            }
          }

          if (resolvedCorrectId) {
            await tx.question.update({
              where: { id: created.id },
              data: {
                correctOptionId: resolvedCorrectId,
                mcqAnswerStatus: 'ANSWERED',
              },
            });
          }
        }

        importedCount++;
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          importedCount,
          duplicateCount,
          unclassifiedCount,
          rejectedCount: errors.length,
          errorReport: errors,
        },
      });

      await tx.activityLog.create({
        data: {
          actorId: session.userId,
          action: 'SPREADSHEET_IMPORT',
          entity: 'ImportBatch',
          entityId: batch.id,
          metadata: { fileName, importedCount, duplicateCount, unclassifiedCount },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      batchId: batch.id,
      summary: {
        totalRows: rows.length,
        importedCount,
        duplicateCount,
        unclassifiedCount,
        rejectedCount: errors.length,
        errors,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Spreadsheet import failed' }, { status: 500 });
  }
}
