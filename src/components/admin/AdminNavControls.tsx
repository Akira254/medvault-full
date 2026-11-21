'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Eye, LogOut } from 'lucide-react';

export function AdminNavControls({ username, role }: { username: string; role: string }) {
  const router = useRouter();

  const handleEnterPreview = async () => {
    const res = await fetch('/api/admin/preview/enter', { method: 'POST' });
    if (res.ok) {
      router.push('/admin/preview');
      router.refresh();
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2.5">
      <span className="hidden sm:inline text-xs text-gray-400">
        {username} ({role})
      </span>
      <button
        type="button"
        onClick={handleEnterPreview}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0E8A3E] hover:bg-[#0B7A36] text-white text-xs font-bold"
      >
        <Eye className="w-3.5 h-3.5" />
        Preview Site
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9B1126] hover:bg-[#7A0C1D] text-white text-xs font-bold"
      >
        <LogOut className="w-3.5 h-3.5" />
        End Admin Session
      </button>
    </div>
  );
}
