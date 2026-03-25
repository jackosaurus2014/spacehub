'use client';

import { ReactNode } from 'react';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => ReactNode;
  primary?: boolean; // Shown as card title on mobile
}

export interface MobileTableViewProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onHeaderClick?: (key: keyof T) => void;
  renderSortIcon?: (key: keyof T) => ReactNode;
  emptyMessage?: string;
  footer?: ReactNode;
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MobileTableView<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onHeaderClick,
  renderSortIcon,
  emptyMessage = 'No data found.',
  footer,
}: MobileTableViewProps<T>) {
  const primaryCol = columns.find((c) => c.primary);
  const nonPrimaryCols = columns.filter((c) => !c.primary);

  // Helper to render a cell value
  function renderCell(col: Column<T>, row: T): ReactNode {
    if (col.render) {
      return col.render(row[col.key], row);
    }
    const val = row[col.key];
    if (val === null || val === undefined) return <span className="text-slate-600 italic">--</span>;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  }

  return (
    <>
      {/* ── Desktop Table (md+) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.05] border-b border-white/[0.06]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={onHeaderClick ? () => onHeaderClick(col.key) : undefined}
                  className={`px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider whitespace-nowrap ${
                    onHeaderClick ? 'cursor-pointer hover:text-white transition-colors select-none' : ''
                  }`}
                >
                  {col.label}
                  {renderSortIcon ? renderSortIcon(col.key) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.map((row) => (
              <tr
                key={String(row[keyField])}
                className="hover:bg-white/[0.03] transition-colors"
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-white/70">
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && (
          <div className="p-8 text-center text-slate-400">{emptyMessage}</div>
        )}

        {footer}
      </div>

      {/* ── Mobile Cards (<md) ── */}
      <div className="md:hidden space-y-3">
        {data.length === 0 && (
          <div className="p-8 text-center text-slate-400">{emptyMessage}</div>
        )}

        {data.map((row) => (
          <div
            key={String(row[keyField])}
            className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-4"
          >
            {/* Card header from primary column */}
            {primaryCol && (
              <div className="mb-3 pb-2 border-b border-white/[0.06]">
                <div className="text-sm font-semibold text-white">
                  {renderCell(primaryCol, row)}
                </div>
              </div>
            )}

            {/* Label-value pairs */}
            <div className="space-y-2">
              {nonPrimaryCols.map((col) => (
                <div
                  key={String(col.key)}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="text-xs uppercase tracking-wider text-slate-500 shrink-0 pt-0.5">
                    {col.label}
                  </span>
                  <span className="text-sm text-white/80 text-right">
                    {renderCell(col, row)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {footer}
      </div>
    </>
  );
}
