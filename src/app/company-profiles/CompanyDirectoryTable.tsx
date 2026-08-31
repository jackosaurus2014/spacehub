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

// Terminal wave (2026-08-31): screener columns. DataTable sorts by the flat
// row property named in `key`, so nested _count values are lifted onto the
// row in the component body below.
type ScreenerRow = CompanyCard & { openJobs: number; contractsCount: number };

const columns: DataTableColumn<ScreenerRow>[] = [
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
  {
    key: 'revenueEstimate',
    header: 'Revenue (est.)',
    numeric: true,
    render: (c) => formatMoney(c.revenueEstimate),
  },
  {
    key: 'openJobs',
    header: 'Open roles',
    numeric: true,
    render: (c) => (c.openJobs > 0 ? c.openJobs : '—'),
  },
  {
    key: 'contractsCount',
    header: 'Contracts',
    numeric: true,
    render: (c) => (c.contractsCount > 0 ? c.contractsCount : '—'),
  },
];

export default function CompanyDirectoryTable({
  rows,
  caption = 'Space company directory',
  filterable = false,
  emptyLabel = 'No companies match this filter.',
}: CompanyDirectoryTableProps) {
  const screenerRows: ScreenerRow[] = rows.map((r) => ({
    ...r,
    openJobs: r._count?.jobPostings ?? 0,
    contractsCount: r._count?.contracts ?? 0,
  }));
  return (
    <>
      <DataTable<ScreenerRow>
        columns={columns}
        rows={screenerRows}
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
