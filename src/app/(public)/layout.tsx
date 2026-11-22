import React from 'react';
import { prisma } from '@/lib/prisma';
import { getStudentSession } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [disciplines, user] = await Promise.all([
    prisma.discipline.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        subdisciplines: {
          orderBy: { orderIndex: 'asc' },
          select: { id: true, name: true, slug: true },
        },
      },
    }).catch(() => []),
    getStudentSession(),
  ]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-navy-900 text-white min-w-0">
      <Navbar disciplines={disciplines} user={user} />
      <main className="flex-1 w-full max-w-full min-w-0 overflow-x-clip">{children}</main>
      <Footer />
    </div>
  );
}