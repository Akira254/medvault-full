'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Monitor, Tablet, Smartphone, LogOut, AlertTriangle } from 'lucide-react';

function AdminPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locked = searchParams.get('locked') === '1';

  const [mode, setMode] = useState<'live' | 'drafts'>('live');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [confirmExit, setConfirmExit] = useState(false);

  const handleExitPreview = async () => {
    const res = await fetch('/api/admin/preview/exit', { method: 'POST' });
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    }
  };

  const frameWidth =
    device === 'mobile' ? 'w-[375px]' : device === 'tablet' ? 'w-[768px]' : 'w-full';

  return (
    <div className="admin-neon-frame flex flex-col">
      {/* Persistent Read-Only Banner (Section 7B) */}
      <div className="admin-banner-danger px-4 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <Lock className="w-5 h-5 shrink-0" />
          <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">
            PREVIEW MODE: READ ONLY — Editing, publishing, and admin navigation are locked.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live vs Draft toggle */}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'live' | 'drafts')}
            aria-label="Preview content visibility"
            className="px-2.5 py-1.5 rounded bg-black/50 border border-white/30 text-white text-xs font-semibold"
          >
            <option value="live">As it is live now (Published only)</option>
            <option value="drafts">As it will look after publishing (Includes Drafts)</option>
          </select>

          {/* Device Width Switcher */}
          <div className="flex items-center bg-black/40 rounded p-0.5 border border-white/20">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              aria-label="Desktop width"
              className={`p-1.5 rounded ${device === 'desktop' ? 'bg-white text-black' : 'text-white'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('tablet')}
              aria-label="Tablet width"
              className={`p-1.5 rounded ${device === 'tablet' ? 'bg-white text-black' : 'text-white'}`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              aria-label="Mobile width"
              className={`p-1.5 rounded ${device === 'mobile' ? 'bg-white text-black' : 'text-white'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {!confirmExit ? (
            <button
              type="button"
              onClick={() => setConfirmExit(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[#0E8A3E] hover:bg-[#0B7A36] text-white text-xs font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit Preview
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-black/80 px-2.5 py-1 rounded">
              <span className="text-xs">Confirm exit?</span>
              <button
                type="button"
                onClick={handleExitPreview}
                className="px-2 py-0.5 rounded bg-[#0E8A3E] text-white text-xs font-bold"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmExit(false)}
                className="px-2 py-0.5 rounded bg-gray-700 text-white text-xs"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {locked && (
        <div className="bg-amber-950 text-amber-200 px-4 py-2 text-xs flex items-center gap-2 border-b border-amber-500/40">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Navigation to other admin routes is blocked until you click Exit Preview.</span>
        </div>
      )}

      {/* Sandboxed Real Public Site Frame */}
      <div className="flex-1 bg-black p-4 flex justify-center">
        <iframe
          title="MedVault Public Site Preview"
          src={`/?previewMode=${mode}`}
          className={`${frameWidth} min-h-[82vh] bg-navy-900 rounded-xl border border-gray-700 transition-all`}
        />
      </div>
    </div>
  );
}

export default function AdminPreviewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Loading preview...</div>}>
      <AdminPreviewContent />
    </Suspense>
  );
}