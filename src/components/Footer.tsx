import React from 'react';
import Link from 'next/link';
import { BrandLogo } from './BrandLogo';
import { SubscribeSection } from './SubscribeSection';

export function Footer() {
  return (
    <footer className="bg-[#071426] border-t border-medblue-400/20 text-blue-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="space-y-3">
          <BrandLogo />
          <p className="text-sm text-blue-200/80 leading-relaxed">
            Structured medical revision question bank for MCQs, SAQs, and Essays across preclinical and clinical disciplines.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">
            Navigation
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-medblue-400">Home</Link></li>
            <li><Link href="/question-bank" className="hover:text-medblue-400">Question Bank</Link></li>
            <li><Link href="/subjects" className="hover:text-medblue-400">Subjects</Link></li>
            <li><Link href="/about" className="hover:text-medblue-400">About</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">
            Student Support
          </h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/login" className="hover:text-medblue-400">Log In</Link></li>
            <li><Link href="/register" className="hover:text-medblue-400">Register</Link></li>
            <li><Link href="/dashboard" className="hover:text-medblue-400">Student Dashboard</Link></li>
            <li><Link href="/feedback" className="hover:text-medblue-400">Feedback &amp; Issue Report</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">
            Revision Updates
          </h3>
          <SubscribeSection source="footer" compact />
        </div>
      </div>

      <div className="border-t border-white/10 py-5 px-4 sm:px-8 lg:px-12 text-xs text-blue-200/70 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1440px] mx-auto">
        <p>© {new Date().getFullYear()} MedVault. Educational revision platform.</p>
        <p>AI assistance is for study guidance only and does not replace official marking schemes or clinical advice.</p>
      </div>
    </footer>
  );
}
