import Link from 'next/link';
import type { TrackedLaunch } from '@/lib/rockets';

// One launch, as a row. Server-safe (no hooks). Shared by /rockets/[slug]
// and /launches/[site]/[month]. Dates render in UTC so the same page reads
// the same for every visitor and for Google.

const STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Success', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  failed: { label: 'Failure', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  in_progress: { label: 'In flight', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  scrubbed: { label: 'No outcome recorded', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  go: { label: 'Go', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  upcoming: { label: 'Upcoming', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  tbd: { label: 'Date TBD', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  tbc: { label: 'To be confirmed', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};

export function formatLaunchDate(d: Date | null, withTime = true): string {
  if (!d) return 'Date TBD';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  if (!withTime) return date;
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
  return `${date}, ${time} UTC`;
}

/** Strip the "Rocket | " prefix LL2 puts on launch names when the rocket is shown elsewhere. */
export function missionTitle(l: TrackedLaunch): string {
  const i = l.name.indexOf(' | ');
  return i > 0 ? l.name.slice(i + 3) : l.name;
}

export default function LaunchRow({ launch, showRocket = true, showSite = true, now }: { launch: TrackedLaunch; showRocket?: boolean; showSite?: boolean; now?: Date }) {
  const isFuture = !!launch.launchDate && launch.launchDate.getTime() > (now ?? new Date()).getTime();
  const key = isFuture && (launch.status === 'scrubbed' || launch.status === 'completed') ? 'upcoming' : launch.status;
  const s = STATUS[key] ?? STATUS.upcoming;
  return (
    <Link href={`/launch/${launch.id}`} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:border-cyan-500/30 transition-colors group">
      <div className="sm:w-44 flex-shrink-0 text-sm text-slate-400 tabular-nums">{formatLaunchDate(launch.launchDate, !isFuture || launch.status !== 'tbd')}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">{missionTitle(launch)}</div>
        <div className="text-xs text-slate-500 truncate">
          {[showRocket ? launch.rocket : null, launch.agency, showSite ? launch.location : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      <span className={`self-start sm:self-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
    </Link>
  );
}
