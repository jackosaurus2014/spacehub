'use client';

import { useCallback, RefObject } from 'react';
import { exportToCSV, exportToPNG } from '@/lib/chart-export';

export interface ChartExportButtonProps {
  /** Array of data objects to export as CSV */
  data: Record<string, unknown>[];
  /** Ref to the container element that holds the SVG chart */
  chartRef: RefObject<HTMLDivElement | null>;
  /** Base filename for downloads (without extension) */
  filename?: string;
}

export default function ChartExportButton({
  data,
  chartRef,
  filename = 'chart',
}: ChartExportButtonProps) {
  const handleCSV = useCallback(() => {
    exportToCSV(data, filename);
  }, [data, filename]);

  const handlePNG = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;
    exportToPNG(svg as SVGSVGElement, filename);
  }, [chartRef, filename]);

  return (
    <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        type="button"
        onClick={handleCSV}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 transition-colors duration-150"
        title="Export data as CSV"
      >
        <DownloadIcon />
        CSV
      </button>
      <button
        type="button"
        onClick={handlePNG}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-slate-100 transition-colors duration-150"
        title="Export chart as PNG"
      >
        <DownloadIcon />
        PNG
      </button>
    </div>
  );
}

/** Small download arrow icon (14x14) */
function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
