import React from 'react';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'about_content' } }).catch(() => null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-6">
      <h1 className="text-3xl font-bold text-white">About MedVault</h1>
      <div className="rounded-2xl bg-navy-950 border border-medblue-400/25 p-8 text-blue-100 leading-relaxed space-y-4 whitespace-pre-line">
        {setting?.value ||
          'MedVault is an academic medical revision question bank designed for structured practice across MCQs, SAQs, and Essays.'}
      </div>
    </div>
  );
}
