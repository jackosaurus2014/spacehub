'use client';

/**
 * Thin client wrapper around the shared `DataTable` primitive.
 *
 * It exists because `DataTable`'s `columns[].render` and `rowHref` are
 * FUNCTIONS, and functions cannot cross the server → client props boundary.
 * The server page renders <CompanyDirectoryTable rows={...} /> with fully
 * serializable props; the column definitions live here, on the client side of
 * the line. Result: the first 24 directory rows are real, crawlable HTML.
 */

import Link from 'next/link';
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable';
import { formatMoney, sectorLabel, type CompanyCard } from './shared';

export interface CompanyDirectoryTableProps {
  rows: CompanyCard[];
  /** Accessible table name. */
  caption?: string;
  /** Show DataTable's own "/"-focusable filter box. */
  filterable?: boolean;
  emptyLabel?: string;
}

const columns: DataTableColumn<CompanyCard>[] = [
  {
    key: 'name',
    header: 'Company',
    render: (c) => (
      <span className="inline-flex items-baseline gap-2">
        <span className="font-medium">{c.name}</span>
        {c.ticker && (
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--ink-3)]">
            {c.ticker}
          </span>
        )}
      </span>
    ),
  },
  { key: 'sector', header: 'Sector', render: (c) => sectorLabel(c.sector) },
  {
    key: 'headquarters',
    header: 'Headquarters',
    render: (c) => c.headquarters || c.country || '—',
  },
  {
    key: 'totalFunding',
    header: 'Funding',
    numeric: true,
    render: (c) => formatMoney(c.totalFunding),
  },
  {
    key: 'marketCap',
    header: 'Market cap',
    numeric: true,
    render: (c) => (c.isPublic ? formatMoney(c.marketCap) : '—'),
  },
];

export default function CompanyDirectoryTable({
  rows,
  caption = 'Space company directory',
  filterable = false,
  emptyLabel = 'No companies match this filter.',
}: CompanyDirectoryTableProps) {
  return (
    <>
      <DataTable<CompanyCard>
        columns={columns}
        rows={rows}
        rowHref={(c) => `/company-profiles/${c.slug}`}
        caption={caption}
        filterable={filterable}
        filterPlaceholder="Filter these rows…"
        emptyLabel={emptyLabel}
      />
      {/*
        Crawlers and keyboard users both get a plain anchor per row from the
        table above; this is only a belt-and-braces escape hatch to the full
        directory when the first screen is a subset.
      */}
      <p className="mt-3 font-body text-[0.8125rem] text-[var(--ink-3)]">
        Every row links to the full profile. <Link href="/startups" className="text-[var(--ember)] hover:underline">Private / pre-IPO companies →</Link>
      </p>
    </>
  );
}
