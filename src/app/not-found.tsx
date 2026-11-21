import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-navy-900 text-white flex flex-col items-center justify-center px-4 text-center space-y-4">
      <h1 className="text-5xl font-extrabold text-medblue-400">404</h1>
      <h2 className="text-2xl font-bold">Page Not Found</h2>
      <p className="text-sm text-blue-200/80 max-w-md">
        The requested revision page or question could not be found or is not yet published.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-medblue-500 hover:bg-medblue-600 text-white font-semibold text-sm"
      >
        Return to MedVault Home
      </Link>
    </div>
  );
}
