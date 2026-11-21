import React from 'react';
import Link from 'next/link';

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-medblue-400 rounded-md">
      {/* Open book with caduceus line-art */}
      <svg
        width={compact ? 36 : 42}
        height={compact ? 36 : 42}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0 text-white"
      >
        {/* Open Book Pages */}
        <path
          d="M6 34C11 31.5 18 32 24 35.5C30 32 37 31.5 42 34V16C37 13.5 30 14 24 17.5C18 14 11 13.5 6 16V34Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M24 17.5V35.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* Caduceus Staff & Wings */}
        <path d="M24 7V39" stroke="#63B3ED" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="24" cy="6.5" r="2" fill="#63B3ED" />
        <path
          d="M16 11C18.5 9.5 21.5 10.5 24 12.5C26.5 10.5 29.5 9.5 32 11"
          stroke="#63B3ED"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Intertwined Serpents */}
        <path
          d="M20.5 16C26 17.5 26 21 20.5 22.5C26 24 26 27.5 20.5 29"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M27.5 16C22 17.5 22 21 27.5 22.5C22 24 22 27.5 27.5 29"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col leading-none">
        <span className="text-xl sm:text-2xl font-extrabold tracking-tight">
          <span className="text-white">Med</span>
          <span className="text-medblue-400">Vault</span>
        </span>
        {!compact && (
          <span className="text-[11px] sm:text-xs italic text-blue-100/85 tracking-wide mt-0.5">
            Revise. Practice. Excel.
          </span>
        )}
      </div>
    </Link>
  );
}
