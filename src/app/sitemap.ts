import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const [disciplines, questions] = await Promise.all([
    prisma.discipline.findMany({ select: { slug: true, updatedAt: true } }).catch(() => []),
    prisma.question.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, updatedAt: true },
      take: 5000,
    }).catch(() => []),
  ]);

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/question-bank`, lastModified: new Date() },
    { url: `${baseUrl}/subjects`, lastModified: new Date() },
    { url: `${baseUrl}/about`, lastModified: new Date() },
    ...disciplines.map((d) => ({
      url: `${baseUrl}/subjects/${d.slug}`,
      lastModified: d.updatedAt,
    })),
    ...questions.map((q) => ({
      url: `${baseUrl}/question/${q.id}`,
      lastModified: q.updatedAt,
    })),
  ];
}
