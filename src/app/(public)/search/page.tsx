import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { SearchBar } from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

export default async function SearchResultsPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim();

  const results = q
    ? await prisma.question.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { stemPlain: { contains: q, mode: 'insensitive' } },
            { discipline: { name: { contains: q, mode: 'insensitive' } } },
            { topic: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: { discipline: true, topic: true },
        take: 40,
      })
    : [];

  if (q && results.length === 0) {
    await prisma.searchLog.create({
      data: { query: q, resultsCount: 0 },
    }).catch(() => {});
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-white">
        {q ? `Search Results for "${q}"` : 'Search MedVault'}
      </h1>
      <div className="max-w-2xl">
        <SearchBar initialQuery={q} />
      </div>

      {q && results.length === 0 ? (
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/20 p-8 text-blue-200">
          No published questions matched "{q}". Try a broader topic or discipline term.
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((item) => (
            <Link
              key={item.id}
              href={`/question/${item.id}`}
              className="block rounded-2xl bg-white text-slate-900 p-5 shadow hover:border-medblue-500 border border-slate-200"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-navy-900 mb-1">
                <span>Q{item.displayNumber} • {item.category}</span>
                {item.discipline && <span className="text-medblue-600">• {item.discipline.name}</span>}
              </div>
              <p className="text-sm text-slate-800 line-clamp-2">{item.stemPlain}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
