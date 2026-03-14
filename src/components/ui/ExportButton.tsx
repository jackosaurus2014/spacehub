'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { downloadCSV, downloadJSON } from '@/lib/export-utils';
import { useProgress } from '@/hooks/useProgress';
import ProgressBar from './ProgressBar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  filename: string;
  columns?: { key: string; label: string }[];
  /** Export formats to offer in the dropdown. Defaults to both. */
  formats?: ('csv' | 'json')[];
  label?: string;
  /** Disable the button (e.g. while parent is loading). */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExportButton({
  data,
  filename,
  columns,
  formats = ['csv', 'json'],
  label = 'Export',
  disabled = false,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const progress = useProgress();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      setOpen(false);
      setLoading(true);

      // Start a 3-step progress sequence:
      // 1 - Preparing data, 2 - Generating file, 3 - Downloading
      progress.start(3, 'Preparing data...');

      // Small delay so the user can see each step animate
      await delay(300);
      progress.advance('Generating file...');

      await delay(400);

      try {
        if (format === 'csv') {
          downloadCSV(data, filename, columns);
        } else {
          downloadJSON(data, filename);
        }

        progress.advance('Downloading...');
        await delay(300);

        progress.complete('Export complete!');
      } catch {
        progress.complete('Export failed');
      }

      // Auto-reset after showing the complete state briefly
      await delay(1200);
      progress.reset();
      setLoading(false);
    },
    [data, filename, columns, progress],
  );

  if (data.length === 0) return null;

  const isExporting = progress.totalSteps > 0;
  const isDisabled = disabled || isExporting || loading;

  const formatLabels: Record<string, string> = {
    csv: 'Export CSV',
    json: 'Export JSON',
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={isDisabled}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/[0.08] text-white/90 hover:bg-white/[0.1] hover:text-white transition-all border border-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        {/* Download icon (inline SVG) */}
        {loading ? (
          <svg
            className="w-3.5 h-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        )}
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
        <div className="absolute right-0 mt-1 z-50 bg-white/[0.06] border border-white/[0.1] rounded-lg shadow-lg overflow-hidden min-w-[120px]">
          {formats.map((fmt, idx) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className={`w-full px-4 py-2 text-left text-xs text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors min-h-[44px] ${
                idx > 0 ? 'border-t border-white/[0.06]' : ''
              }`}
            >
              {formatLabels[fmt] ?? fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
