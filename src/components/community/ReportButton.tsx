'use client';

import { useState } from 'react';
import ReportModal from './ReportModal';

interface ReportButtonProps {
  contentType: 'thread' | 'post' | 'message' | 'profile';
  contentId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ReportButton({ contentType, contentId, size = 'sm', className = '' }: ReportButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`text-slate-500 hover:text-red-400 transition-colors p-1 ${className}`}
        title="Report"
        aria-label={`Report this ${contentType}`}
      >
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
        </svg>
      </button>

      <ReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        contentType={contentType}
        contentId={contentId}
      />
    </>
  );
}
