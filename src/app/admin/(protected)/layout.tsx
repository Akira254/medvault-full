import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getValidAdminSession } from '@/lib/auth';
import { AdminNavControls } from '@/components/admin/AdminNavControls';

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getValidAdminSession();
  if (!session) {
    redirect('/admin/login?reason=expired');
  }

  const navItems = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Questions', href: '/admin/questions' },
    { label: 'Taxonomy', href: '/admin/taxonomy' },
    { label: 'Imports (Spreadsheet/Doc)', href: '/admin/imports' },
    { label: 'Unclassified Queue', href: '/admin/unclassified' },
    { label: 'Feedback Inbox', href: '/admin/feedback' },
    { label: 'Subscribers', href: '/admin/subscribers' },
    { label: 'Users & Roles', href: '/admin/users' },
    { label: 'Analytics', href: '/admin/analytics' },
    { label: 'AI Settings', href: '/admin/ai-settings' },
    { label: 'Activity Log', href: '/admin/activity' },
  ];

  return (
    <div className="admin-neon-frame flex flex-col">
      {/* Frozen Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#11151C]/95 backdrop-blur border-b border-gray-800 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded text-xs font-extrabold uppercase bg-[#9B1126] text-white">
            ADMIN ENV
          </span>
          <span className="font-bold text-sm sm:text-base text-white">
            MedVault Control Center
          </span>
        </div>

        <AdminNavControls username={session.user.username} role={session.user.role} />
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Fixed Left Sidebar */}
        <aside className="w-full lg:w-64 bg-[#11151C] border-b lg:border-b-0 lg:border-r border-gray-800 p-3 shrink-0">
          <nav aria-label="Admin sidebar" className="flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1E2530] whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
