import Link from 'next/link';
import { missionOf } from '@/lib/next-launch';
import type { UpcomingRow } from '@/lib/home-data';

// Welded to the hero: the next five, so the board is always the second thing
// you see. Server-rendered; relative times are computed once per cache.
function rel(d: Date | null, now: Date): string {
  if (!d) return 'TBD';
  const ms = d.getTime() - now.getTime();
  if (ms <= 0) return 'LIVE';
  const h = Math.floor(ms / 3600000);
  const days = Math.floor(h / 24);
  return days > 0 ? `T−${days}d ${String(h % 24).padStart(2, '0')}h` : `T−${String(h).padStart(2, '0')}h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}m`;
}

export default function NextFiveRail({ rows, excludeId, now }: { rows: UpcomingRow[]; excludeId?: string | null; now: Date }) {
  const list = rows.filter((r) => r.id !== excludeId).slice(0, 4);
  return (
    <div className="border-b border-[var(--line)] bg-[rgba(11,10,9,.6)]" aria-label="Next launches">
      <div className="container mx-auto px-4 flex overflow-x-auto [scrollbar-width:thin]">
        {list.map((r) => (
          <Link key={r.id} href={`/launch/${r.id}`} className="flex-[1_0_200px] min-w-0 py-4 pr-5 mr-5 border-r border-[var(--line)] group">
            <p className="font-mono text-[12.5px] text-[var(--ember)] tabular-nums">{rel(r.launchDate, now)}</p>
            <p className="text-[14px] font-medium text-[var(--ink)] mt-1 truncate group-hover:text-[var(--ember)]">{missionOf(r.name)}</p>
            <p className="text-[12px] text-[var(--ink-3)] mt-0.5 truncate">{[r.rocket?.replace(/ Block 5$/, ''), r.location?.split(',')[0]].filter(Boolean).join(' · ')}</p>
          </Link>
        ))}
        <Link href="/mission-control" className="flex-[1_0_200px] min-w-0 py-4 group">
          <p className="font-mono text-[12.5px] text-[var(--ember)]">Board</p>
          <p className="text-[14px] font-medium text-[var(--ink)] mt-1 group-hover:text-[var(--ember)]">Every upcoming launch &rarr;</p>
          <p className="text-[12px] text-[var(--ink-3)] mt-0.5">Countdowns, streams, outcomes</p>
        </Link>
      </div>
    </div>
  );
}
