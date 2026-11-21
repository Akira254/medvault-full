import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpen, BarChart3, Zap, ArrowRight, Activity, Layers, CheckCircle2, Sparkles } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { SearchBar } from '@/components/SearchBar';
import { SubscribeSection } from '@/components/SubscribeSection';

export const revalidate = 60;

export default async function HomePage() {
  const heroBgSetting = await prisma.systemSetting
    .findUnique({ where: { key: 'hero_bg_path' } })
    .catch(() => null);
  const heroBgPath = heroBgSetting?.value || process.env.NEXT_PUBLIC_HERO_BG_PATH || '/images/hero-bg.jpg';

  const disciplines = await prisma.discipline
    .findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: {
            questions: { where: { status: 'PUBLISHED' } },
          },
        },
      },
    })
    .catch(() => []);

  return (
    <div className="relative">
      {/* SECTION 1 & 1B: FULL-VIEWPORT HERO MATCHING REFERENCE ARRANGEMENT */}
      <section className="relative min-h-[calc(100svh-5rem)] -mt-20 pt-20 flex flex-col justify-between overflow-hidden bg-navy-950">
        {/* Background Image (hero-bg.jpg, right-anchored, decorative alt="") */}
        <Image
          src={heroBgPath}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[75%_center] md:object-right select-none pointer-events-none"
        />

        {/* WCAG AA Contrast Navy Gradient Overlays (Section 1A) */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#071426]/90 via-[#0B1F3A]/85 to-[#0B1F3A]/90 md:bg-gradient-to-r md:from-[#0B1F3A]/95 md:via-[#0B1F3A]/80 md:to-transparent"
        />

        {/* Left Column Composition (Section 1B exact vertical order) */}
        <div className="relative z-10 max-w-[1440px] w-full mx-auto px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-10 flex-1 flex flex-col justify-between">
          <div className="w-full md:w-[60%] xl:w-[50%] space-y-5 sm:space-y-6">
            {/* 2. Search Bar directly below header at top of left column */}
            <div className="w-full">
              <SearchBar />
            </div>

            {/* 3. Eyebrow with thin horizontal rule after it */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-blue-200 whitespace-nowrap">
                YOUR ULTIMATE MEDICAL REVISION PARTNER
              </span>
              <span className="h-[1px] flex-1 bg-blue-300/40" aria-hidden="true" />
            </div>

            {/* 4. Two-line Headline */}
            <h1 className="font-extrabold tracking-tight leading-[1.02] text-[clamp(2.6rem,5.6vw,5.1rem)]">
              <span className="block text-white">Medical Revision</span>
              <span className="block text-medblue-500">Questions Bank</span>
            </h1>

            {/* 5. Sub-text (no hardcoded/invented question counts) */}
            <p className="text-base sm:text-lg xl:text-[20px] text-blue-50/95 leading-relaxed max-w-[560px]">
              Access thousands of curated MCQs, SAQs, and Essays, categorized by units and topics to help you study smarter and ace your exams.
            </p>

            {/* 6. Primary CTA */}
            <div>
              <Link
                href="/question-bank"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-medblue-500 hover:bg-medblue-600 text-white font-semibold text-base shadow-xl shadow-medblue-600/30 transition-colors"
              >
                <span>Start Practicing</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* 7. Three-Column Feature Row with vertical dividers */}
            <div className="pt-2 grid grid-cols-3 divide-x divide-white/25 max-w-[540px] text-center">
              <div className="px-2 sm:px-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full border border-medblue-400/70 bg-navy-900/60 flex items-center justify-center text-medblue-400">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-white leading-snug">
                  Comprehensive<br />Coverage
                </span>
              </div>

              <div className="px-2 sm:px-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full border border-medblue-400/70 bg-navy-900/60 flex items-center justify-center text-medblue-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-white leading-snug">
                  Track Your<br />Progress
                </span>
              </div>

              <div className="px-2 sm:px-4 flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full border border-medblue-400/70 bg-navy-900/60 flex items-center justify-center text-medblue-400">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-white leading-snug">
                  Study Anytime,<br />Anywhere
                </span>
              </div>
            </div>
          </div>

          {/* Bottom-Right Signature on pale light-blue wave */}
          <div className="mt-8 md:mt-0 self-end inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/90 md:bg-transparent text-navy-900 font-semibold italic text-sm sm:text-base">
            <Activity className="w-5 h-5 text-medblue-600" aria-hidden="true" />
            <span>Study Smart. Score Higher.</span>
          </div>
        </div>
      </section>

      {/* BELOW HERO: BROWSE BY DISCIPLINE (Dynamic from DB) */}
      <section className="py-16 sm:py-20 bg-navy-900 border-t border-medblue-400/15">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-medblue-400">
                Curriculum Taxonomy
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
                Browse by Discipline
              </h2>
            </div>
            <Link
              href="/subjects"
              className="text-sm font-semibold text-medblue-400 hover:text-white inline-flex items-center gap-1"
            >
              View all subjects <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {disciplines.length === 0 ? (
            <div className="rounded-2xl border border-medblue-400/20 bg-navy-800/40 p-10 text-center">
              <Layers className="w-10 h-10 text-medblue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white">No published disciplines yet</h3>
              <p className="text-sm text-blue-200/80 max-w-md mx-auto mt-1">
                Disciplines and topics appear automatically as administrators publish curated revision questions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {disciplines.map((disc) => (
                <Link
                  key={disc.id}
                  href={`/subjects/${disc.slug}`}
                  className="group rounded-2xl border border-medblue-400/20 bg-navy-800/50 hover:bg-navy-800 p-6 transition-all hover:border-medblue-400/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-medblue-400 transition-colors">
                      {disc.name}
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-medblue-500/20 text-medblue-400">
                      {disc._count.questions} published
                    </span>
                  </div>
                  {disc.description && (
                    <p className="text-sm text-blue-200/80 mt-2 line-clamp-2">{disc.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS STRIP */}
      <section className="py-16 bg-navy-950 border-y border-medblue-400/15">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            How MedVault Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-navy-900/90 border border-white/10 p-6 space-y-3">
              <Layers className="w-7 h-7 text-medblue-400" />
              <h3 className="text-lg font-semibold text-white">1. Filter by Unit &amp; Format</h3>
              <p className="text-sm text-blue-200/85 leading-relaxed">
                Drill down by discipline, subdiscipline, topic, exam year, and category (MCQ, SAQ, or Essay).
              </p>
            </div>
            <div className="rounded-2xl bg-navy-900/90 border border-white/10 p-6 space-y-3">
              <CheckCircle2 className="w-7 h-7 text-medblue-400" />
              <h3 className="text-lg font-semibold text-white">2. Practice &amp; Verify</h3>
              <p className="text-sm text-blue-200/85 leading-relaxed">
                Get instant server-validated feedback and administrator explanations on Answered MCQs, and clear mark allocations on SAQs and Essays.
              </p>
            </div>
            <div className="rounded-2xl bg-navy-900/90 border border-white/10 p-6 space-y-3">
              <Sparkles className="w-7 h-7 text-medblue-400" />
              <h3 className="text-lg font-semibold text-white">3. Structured AI Study Help</h3>
              <p className="text-sm text-blue-200/85 leading-relaxed">
                Request mark-sized explanations and option-by-option breakdowns directly beside any question.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SUBSCRIBE SECTION (Section 9) */}
      <section className="py-16 sm:py-20 bg-navy-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Stay Updated on New Revision Units
          </h2>
          <p className="text-sm sm:text-base text-blue-200/85">
            Subscribe to receive notifications when new disciplines, past-paper topics, and curriculum updates are published.
          </p>
          <div className="pt-2 text-left">
            <SubscribeSection source="homepage" />
          </div>
        </div>
      </section>
    </div>
  );
}
