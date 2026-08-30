'use client';

/**
 * DataTable — the shared table primitive (SYNTHESIS.md §2.4, graft A1).
 *
 * Sortable, sticky header, tabular numerics right-aligned, gridlines not zebra,
 * whole-row link, keyboard up/down + Enter + "/". Under 640px it falls back to
 * stacked label/value cards. No virtualization: above 100 rows it just renders.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface DataTableColumn<T> {
  /** Property on the row used for sorting and for the default cell body. */
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right';
  /** Renders tabular-nums, right-aligned by default, and sorts numerically. */
  numeric?: boolean;
  /** Defaults to true. */
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T extends { id: string | number }> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Whole-row link target. The first cell becomes a real anchor. */
  rowHref?: (row: T) => string;
  /** Accessible name for the table. */
  caption: string;
  /** Show a filter box; "/" focuses it from anywhere on the page. */
  filterable?: boolean;
  filterPlaceholder?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** Shown in place of rows when the filter or the data yields nothing. */
  emptyLabel?: string;
  className?: string;
}

type Dir = 'asc' | 'desc';

function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** Exported for tests: nulls always sink, numerics compare numerically. */
export function compareRows(a: unknown, b: unknown, numeric: boolean): number {
  const an = a === null || a === undefined || a === '';
  const bn = b === null || b === undefined || b === '';
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  if (numeric) return Number(a) - Number(b);
  return cellText(a).localeCompare(cellText(b), undefined, { numeric: true, sensitivity: 'base' });
}

export default function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  rowHref,
  caption,
  filterable = false,
  filterPlaceholder = 'Filter…',
  initialSort,
  emptyLabel = 'No rows match this filter.',
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key ?? null);
  const [dir, setDir] = useState<Dir>(initialSort?.dir ?? 'asc');
  const [query, setQuery] = useState('');
  const filterRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const reduced = useReducedMotion();

  // "/" focuses the filter, unless the user is already typing somewhere.
  useEffect(() => {
    if (!filterable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      e.preventDefault();
      filterRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filterable]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => columns.some((c) => cellText((r as any)[c.key]).toLowerCase().includes(q)))
      : rows;
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    const sorted = [...filtered].sort((a, b) =>
      compareRows((a as any)[sortKey], (b as any)[sortKey], Boolean(col?.numeric))
    );
    return dir === 'desc' ? sorted.reverse() : sorted;
  }, [rows, columns, query, sortKey, dir]);

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setDir('asc');
      return key;
    });
  }, []);

  const openRow = (tr: HTMLTableRowElement) => {
    const a = tr.querySelector('a[data-row-link]') as HTMLAnchorElement | null;
    a?.click();
  };

  const onRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openRow(e.currentTarget);
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const all = Array.from(bodyRef.current?.querySelectorAll<HTMLTableRowElement>('tr[data-row]') ?? []);
    const i = all.indexOf(e.currentTarget);
    const next = all[e.key === 'ArrowDown' ? i + 1 : i - 1];
    if (!next) return;
    next.focus();
    next.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  };

  const alignOf = (c: DataTableColumn<T>) => c.align ?? (c.numeric ? 'right' : 'left');
  const bodyOf = (row: T, c: DataTableColumn<T>) =>
    c.render ? c.render(row) : cellText((row as any)[c.key]);

  return (
    <div className={className}>
      {filterable && (
        <div className="mb-3 flex items-center gap-2">
          <input
            ref={filterRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={filterPlaceholder}
            aria-label={`Filter ${caption}`}
            className="min-h-[44px] w-full max-w-sm rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--surface)] px-3 font-body text-[0.875rem] text-[var(--ink)] placeholder:text-[var(--ink-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]"
          />
          <kbd className="hidden font-mono text-[11px] text-[var(--ink-3)] sm:inline">/</kbd>
        </div>
      )}

      {/* 640px and up: the table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left font-body text-[0.875rem]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-[var(--elev)]">
            <tr>
              {columns.map((c) => {
                const sortable = c.sortable !== false;
                const active = sortKey === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`border-b border-[var(--line)] px-3 py-1 font-body text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)] ${alignOf(c) === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex min-h-[44px] items-center gap-1 uppercase tracking-[0.14em] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]"
                      >
                        {c.header}
                        <span aria-hidden="true" className="text-[var(--ember)]">
                          {active ? (dir === 'asc' ? '▲' : '▼') : '─'}
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex min-h-[44px] items-center">{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={bodyRef}>
            {visible.map((row) => (
              <tr
                key={row.id}
                data-row=""
                tabIndex={rowHref ? 0 : undefined}
                onKeyDown={rowHref ? onRowKeyDown : undefined}
                onClick={
                  rowHref
                    ? (e) => {
                        if ((e.target as HTMLElement).closest('a,button')) return;
                        openRow(e.currentTarget);
                      }
                    : undefined
                }
                className={`border-b border-[var(--line)] text-[var(--ink-2)] ${rowHref ? 'cursor-pointer hover:bg-[var(--hover)]' : ''} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--ember)]`}
              >
                {columns.map((c, ci) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2.5 align-middle ${alignOf(c) === 'right' ? 'text-right' : 'text-left'} ${c.numeric ? 'font-mono tabular-nums text-[var(--ink)]' : ''}`}
                  >
                    {ci === 0 && rowHref ? (
                      <Link
                        href={rowHref(row)}
                        data-row-link=""
                        tabIndex={-1}
                        className="text-[var(--ink)] hover:text-[var(--ember)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ember)]"
                      >
                        {bodyOf(row, c)}
                      </Link>
                    ) : (
                      bodyOf(row, c)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="px-3 py-6 font-body text-[0.875rem] text-[var(--ink-3)]">{emptyLabel}</p>
        )}
      </div>

      {/* Under 640px: stacked label/value cards */}
      <ul className="space-y-2 sm:hidden">
        {visible.map((row) => (
          <li
            key={row.id}
            className="rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-3"
          >
            {columns.map((c, ci) => (
              <div key={c.key} className="flex items-baseline justify-between gap-3 py-1">
                <span className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-[var(--ink-3)]">
                  {c.header}
                </span>
                <span
                  className={`text-right text-[0.875rem] text-[var(--ink)] ${c.numeric ? 'font-mono tabular-nums' : ''}`}
                >
                  {ci === 0 && rowHref ? (
                    <Link href={rowHref(row)} className="inline-flex min-h-[44px] items-center text-[var(--ember)]">
                      {bodyOf(row, c)}
                    </Link>
                  ) : (
                    bodyOf(row, c)
                  )}
                </span>
              </div>
            ))}
          </li>
        ))}
        {visible.length === 0 && (
          <li className="py-6 font-body text-[0.875rem] text-[var(--ink-3)]">{emptyLabel}</li>
        )}
      </ul>
    </div>
  );
}
