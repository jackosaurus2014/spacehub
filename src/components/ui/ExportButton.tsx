'use client';

import { useState } from 'react';
import { downloadCSV, downloadJSON } from '@/lib/export-utils';

interface ExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  filename: string;
  columns?: { key: string; label: string }[];
  label?: string;
}

export default function ExportButton({
  data,
  filename,
  columns,
  label = 'Export',
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  if (data.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-space-700/50 text-star-300 hover:bg-space-600/50 hover:text-white transition-all border border-white/[0.06]"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 bg-space-800 border border-white/[0.1] rounded-lg shadow-lg overflow-hidden min-w-[120px]">
            <button
              onClick={() => {
                downloadCSV(data, filename, columns);
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-xs text-star-300 hover:bg-space-700 hover:text-white transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => {
                downloadJSON(data, filename);
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-xs text-star-300 hover:bg-space-700 hover:text-white transition-colors border-t border-white/[0.06]"
            >
              Export JSON
            </button>
          </div>
        </>
      )}
    </div>
  );
}
