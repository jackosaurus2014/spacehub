'use client';

import { useState } from 'react';

interface CollapsiblePanelProps {
  /** Panel ID for persistence */
  panelId: string;
  /** Panel title */
  title: string;
  /** Optional count badge shown when collapsed (e.g., "3 items") */
  count?: number;
  /** Start collapsed */
  defaultCollapsed?: boolean;
  /** Called when user clicks remove */
  onRemove?: (panelId: string) => void;
  /** Children content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * V3 Collapsible Panel — data panels within module pages.
 * Can be expanded, collapsed (header-only), or removed.
 *
 * ┌─ Panel Title ──── (3 items) ────── [−] [×] ─┐
 * │  (content)                                    │
 * └───────────────────────────────────────────────┘
 */
export default function CollapsiblePanel({
  panelId,
  title,
  count,
  defaultCollapsed = false,
  onRemove,
  children,
  className = '',
}: CollapsiblePanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`rounded-lg border overflow-hidden ${className}`} style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}>
      {/* Header — always visible */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-[var(--bg-hover)] transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 flex-shrink-0 ${collapsed ? '' : 'rotate-90'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</span>
          {collapsed && count !== undefined && (
            <span className="text-[10px] text-zinc-500 font-mono flex-shrink-0">{count} items</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-[var(--text-primary)] hover:bg-[var(--bg-active)] transition-colors"
            aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            <span className="text-xs">{collapsed ? '+' : '\u2212'}</span>
          </button>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(panelId); }}
              className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Remove panel"
            >
              <span className="text-xs">&times;</span>
            </button>
          )}
        </div>
      </div>
      {/* Content — hidden when collapsed */}
      {!collapsed && (
        <div className="border-t" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--panel-padding, 16px)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
