'use client';

import { useState, useCallback } from 'react';
import { downloadCSV, downloadJSON } from '@/lib/export-utils';
import { useProgress } from '@/hooks/useProgress';
import ProgressBar from './ProgressBar';

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
  const progress = useProgress();

  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      setOpen(false);

      // Start a 3-step progress sequence:
      // 1 - Preparing data, 2 - Generating file, 3 - Downloading
      progress.start(3, 'Preparing data...');

      // Small delay so the user can see each step animate
      await delay(300);
      progress.advance('Generating file...');

      await delay(400);

      if (format === 'csv') {
        downloadCSV(data, filename, columns);
      } else {
        downloadJSON(data, filename);
      }

      progress.advance('Downloading...');
      await delay(300);

      progress.complete('Export complete!');

      // Auto-reset after showing the complete state briefly
      await delay(1200);
      progress.reset();
    },
    [data, filename, columns, progress]
  );

  if (data.length === 0) return null;

  const isExporting = progress.totalSteps > 0;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-space-700/50 text-star-300 hover:bg-space-600/50 hover:text-white transition-all border border-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExporting ? progress.message : label}
      </button>

      {/* Progress indicator shown during export */}
      {isExporting && (
        <div className="absolute left-0 right-0 mt-2 min-w-[180px]">
          <ProgressBar
            value={progress.progress}
            showPercentage
            size="sm"
            variant={progress.progress === 100 ? 'success' : 'default'}
          />
        </div>
      )}

      {/* Dropdown menu */}
      {open && !isExporting && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 bg-space-800 border border-white/[0.1] rounded-lg shadow-lg overflow-hidden min-w-[120px]">
            <button
              onClick={() => handleExport('csv')}
              className="w-full px-4 py-2 text-left text-xs text-star-300 hover:bg-space-700 hover:text-white transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
