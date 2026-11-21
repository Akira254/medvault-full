import { prisma } from '@/lib/prisma';
import { QuestionCategory, Prisma } from '@prisma/client';

/** Neutralise leading =, +, -, @ in spreadsheet cells to prevent formula injection */
export function sanitizeCell(value: unknown): string {
  const str = String(value ?? '').trim();
  if (/^[=+\-@]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/** Strip HTML tags to generate stemPlain for full-text/trgm search */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Basic server-side XSS strip for script/event attributes */
export function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

/** Compute next sequential displayNumber scoped by topicId + category */
export async function getNextDisplayNumber(
  topicId: string | null,
  category: QuestionCategory
): Promise<number> {
  const agg = await prisma.question.aggregate({
    where: { topicId, category },
    _max: { displayNumber: true },
  });
  return (agg._max.displayNumber ?? 0) + 1;
}

/** Renumber questions sequentially inside a topic + category after moves */
export async function renumberTopicCategory(
  topicId: string | null,
  category: QuestionCategory
): Promise<void> {
  const rows = await prisma.question.findMany({
    where: { topicId, category },
    orderBy: [{ displayNumber: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, displayNumber: true },
  });

  for (let i = 0; i < rows.length; i++) {
    const desired = i + 1;
    if (rows[i].displayNumber !== desired) {
      await prisma.question.update({
        where: { id: rows[i].id },
        data: { displayNumber: desired },
      });
    }
  }
}

export async function logAdminActivity(params: {
  actorId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
  });
}