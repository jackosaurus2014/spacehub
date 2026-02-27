'use client';

import { useState } from 'react';

export default function ExportPDFButton({ className = '' }: { className?: string }) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handleExport = () => {
    setIsPrinting(true);
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
      setIsPrinting(false);
    }, 100);
  };

  return (
    <button
      onClick={handleExport}
      disabled={isPrinting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 transition-colors ${className}`}
      aria-label="Export page as PDF"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {isPrinting ? 'Preparing...' : 'Export PDF'}
    </button>
  );
}
