/**
 * The 24/7 pad view card. Server component — every decision was already made
 * by choosePadView(); this only renders it.
 *
 * The one rule: a LIVE badge appears if and only if padViewIsLive(view).
 * "Nothing is live right now" is a perfectly good thing for a page to say.
 */
import Link from 'next/link';
import VideoStream from './VideoStream';
import { padViewIsLive, type PadView as PadViewModel } from '@/lib/launch-pad-view';

function fmtUtc(iso: string | null): string {
  if (!iso) return 'date TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'date TBD';
  return (
    d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
    }) + ' UTC'
  );
}

export interface PadViewProps {
  view: PadViewModel;
  /** Compact form for the rail on a launch page. */
  compact?: boolean;
}

export default function PadView({ view, compact = false }: PadViewProps) {
  const live = padViewIsLive(view);
  const watchUrl = view.kind === 'live-pad' || view.kind === 'live-other' ? view.stream.watchUrl : view.channel?.watchUrl ?? null;

  return (
    <section
      aria-label="Pad view"
      className="rounded-xl border border-white/[0.08] bg-black/60 overflow-hidden"
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
        {live ? (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-400/40">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
            </span>
            LIVE
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 text-[10px] font-bold border border-white/[0.08]">
            OFF AIR
          </span>
        )}
        <h2 className={`font-semibold text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>{view.headline}</h2>
        {!compact && (
          <Link href="/live/pad" className="ml-auto text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex-shrink-0">
            Pad view &rarr;
          </Link>
        )}
      </header>

      {live ? (
        <VideoStream streamUrl={watchUrl} eventName={view.headline} />
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-slate-400 text-sm">
            No pad camera is on air right now. We will not pretend otherwise.
          </p>
          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Open {view.channel?.name ?? 'the channel'} &rarr;
            </a>
          )}
        </div>
      )}

      <div className="px-4 py-3 space-y-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="text-slate-500 uppercase tracking-wider text-[10px] mr-2">What you&rsquo;re watching</span>
          {view.what}
        </p>

        {view.nextLaunch && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
              Next launch{view.nextLaunch.location ? ` · ${view.nextLaunch.location.split(',')[0]}` : ''}
            </p>
            <Link href={`/launch/${view.nextLaunch.id}`} className="text-sm font-semibold text-white hover:text-cyan-300">
              {view.nextLaunch.name}
            </Link>
            <p className="text-xs text-slate-400 mt-0.5">{fmtUtc(view.nextLaunch.launchDate)}</p>
          </div>
        )}

        {!live && view.replay && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Most recent replay</p>
            <a
              href={view.replay.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-white hover:text-cyan-300"
            >
              {view.replay.name}
            </a>
            <p className="text-xs text-slate-400 mt-0.5">{fmtUtc(view.replay.launchDate)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
