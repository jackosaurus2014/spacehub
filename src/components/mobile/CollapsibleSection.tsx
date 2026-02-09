'use client';

import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  badge?: string | number;
  persistKey?: string;
  className?: string;
}

export default function CollapsibleSection({
  title,
  defaultExpanded = false,
  children,
  badge,
  persistKey,
  className = '',
}: CollapsibleSectionProps) {
  const id = useId();
  const storageKey = persistKey || `collapsible-${id}`;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Load persisted state
  useEffect(() => {
    if (persistKey) {
      const stored = localStorage.getItem(`spacenexus-section-${storageKey}`);
      if (stored !== null) setIsExpanded(stored === 'true');
    }
  }, [persistKey, storageKey]);

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (persistKey) {
      localStorage.setItem(`spacenexus-section-${storageKey}`, String(next));
    }
  };

  return (
    <div className={`border border-slate-700/40 rounded-xl overflow-hidden ${className}`}
      style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.5))' }}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/30 transition-colors min-h-[44px]"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {badge !== undefined && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              {badge}
            </span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-5 h-5 text-slate-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
