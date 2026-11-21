import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const [disciplines, subdisciplines, topics, questions] = await Promise.all([
    prisma.discipline.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 4,
    }),
    prisma.subdiscipline.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { discipline: true },
      take: 4,
    }),
    prisma.topic.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      include: { discipline: true },
      take: 5,
    }),
    prisma.question.findMany({
      where: {
        status: 'PUBLISHED',
        stemPlain: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, displayNumber: true, category: true, stemPlain: true },
      take: 4,
    }),
  ]);

  const suggestions:{ type: 'Discipline' | 'Subdiscipline' | 'Topic' | 'Question' | 'Year'; label: string; href: string }[] = [
    ...disciplines.map((d) => ({
      type: 'Discipline' as const,
      label: d.name,
      href: `/subjects/${d.slug}`,
    })),
    ...subdisciplines.map((s) => ({
      type: 'Subdiscipline' as const,
      label: `${s.name} (${s.discipline.name})`,
      href: `/subjects/${s.discipline.slug}/${s.slug}`,
    })),
    ...topics.map((t) => ({
      type: 'Topic' as const,
      label: `${t.name} — ${t.discipline.name}`,
      href: `/question-bank?topicId=${t.id}`,
    })),
    ...questions.map((qn) => ({
      type: 'Question' as const,
      label: `Q${qn.displayNumber} (${qn.category}): ${qn.stemPlain.slice(0, 70)}...`,
      href: `/question/${qn.id}`,
    })),
  ];

  if (/^(19|20)\d{2}$/.test(q)) {
    suggestions.unshift({
      type: 'Year' as const,
      label: `Examination Year ${q}`,
      href: `/question-bank?year=${q}`,
    });
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
}
