import Link from 'next/link';

// Publication-standard chart frame (SYNTHESIS.md graft C2): a <figure> with
// the title, a one-line deck, the chart itself, and a footer that names the
// source, the record count, the as-of timestamp, the permalink, the PNG and
// the data table. The version an analyst pastes into a memo.
export interface ChartFrameProps {
  title: string;
  deck?: string;
  slug: string;
  source: string;
  recordCount?: number;
  asOf?: Date | string;
  /** Element id of the data table on the same page, for the "table" link. */
  tableId?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ChartFrame({ title, deck, slug, source, recordCount, asOf, tableId, children, className = '' }: ChartFrameProps) {
  const stamp = asOf ? new Date(asOf).toISOString().slice(0, 16).replace('T', ' ') + 'Z' : null;
  return (
    <figure className={`rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden ${className}`}>
      <figcaption className="px-4 pt-4 pb-3 border-b border-[var(--line)]">
        <div className="text-[17px] font-semibold text-[var(--ink)] leading-snug">{title}</div>
        {deck && <p className="text-[13.5px] text-[var(--ink-2)] italic mt-0.5">{deck}</p>}
      </figcaption>
      <div className="bg-[#050508]">{children}</div>
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-[var(--ink-3)] border-t border-[var(--line)]">
        <span>{source}</span>
        {typeof recordCount === 'number' && <span>{recordCount.toLocaleString('en-US')} records</span>}
        {stamp && <span>as of {stamp}</span>}
        <span className="ml-auto flex items-center gap-3">
          <Link href={`/chart/${slug}`} className="hover:text-[var(--ember)]">permalink</Link>
          <a href={`/api/chart/${slug}`} className="hover:text-[var(--ember)]">PNG</a>
          {tableId && <a href={`#${tableId}`} className="hover:text-[var(--ember)]">data table</a>}
        </span>
      </div>
    </figure>
  );
}
