import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function SubjectsIndexPage() {
  const disciplines = await prisma.discipline.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      subdisciplines: { orderBy: { orderIndex: 'asc' } },
      _count: { select: { questions: { where: { status: 'PUBLISHED' } } } },
    },
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Medical Disciplines &amp; Subjects</h1>
        <p className="text-sm text-blue-200/80 mt-1">
          Select a discipline or subdiscipline to revise structured topics and past-paper questions.
        </p>
      </div>

      {disciplines.length === 0 ? (
        <div className="rounded-2xl bg-navy-950 border border-medblue-400/20 p-10 text-center text-blue-200">
          Subjects will appear here once administrators publish curriculum units.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {disciplines.map((d) => (
            <div key={d.id} className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/subjects/${d.slug}`} className="text-xl font-bold text-white hover:text-medblue-400">
                  {d.name}
                </Link>
                <span className="text-xs px-2.5 py-1 rounded-full bg-medblue-500/20 text-medblue-400 font-semibold">
                  {d._count.questions} questions
                </span>
              </div>
              {d.subdisciplines.length > 0 && (
                <ul className="space-y-1.5 border-t border-white/10 pt-3">
                  {d.subdisciplines.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/subjects/${d.slug}/${s.slug}`}
                        className="text-sm text-blue-200 hover:text-white"
                      >
                        → {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
